"""
EarthScape Climate Agency — Authentication & RBAC Engine
=========================================================
Implements JSON Web Token (JWT) authentication and Role-Based Access Control (RBAC):
- Default accounts: Admin (Dr. Aisha Khan) and Analyst (Bilal Ahmed)
- Password hashing with werkzeug.security (PBKDF2 SHA256)
- JWT token issuing, verification, and role guards
"""

import os
import time
from datetime import datetime, timedelta
from functools import wraps
from flask import Blueprint, jsonify, request
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
from pymongo import MongoClient

SECRET_KEY = os.environ.get("JWT_SECRET", "earthscape-super-secret-climate-key-2024")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

# Connect to MongoDB users collection
client = MongoClient("mongodb://localhost:27017/", serverSelectionTimeoutMS=2000)
db = client["earthscape_climate"]
users_col = db["users"]

# Seed initial default users
DEFAULT_USERS = [
    {
        "email": "admin@earthscape.org",
        "name": "Dr. Aisha Khan",
        "title": "Chief Climate Officer & System Admin",
        "role": "admin",
        "password_hash": generate_password_hash("admin123!"),
        "permissions": ["read", "write", "execute_mapreduce", "manage_users", "export_data"],
        "created_at": "2024-01-01T00:00:00Z"
    },
    {
        "email": "analyst@earthscape.org",
        "name": "Bilal Ahmed",
        "title": "Environmental Data Analyst",
        "role": "analyst",
        "password_hash": generate_password_hash("analyst123!"),
        "permissions": ["read", "export_data"],
        "created_at": "2024-01-01T00:00:00Z"
    }
]

def init_auth_db():
    """Ensure default users exist in MongoDB"""
    try:
        for u in DEFAULT_USERS:
            existing = users_col.find_one({"email": u["email"]})
            if not existing:
                users_col.insert_one(u)
    except Exception as e:
        print(f"Warning: Could not initialize auth DB in MongoDB: {e}")

init_auth_db()


def generate_jwt_token(user):
    """Generate a signed JWT token valid for 24 hours"""
    payload = {
        "sub": str(user.get("_id", user["email"])),
        "email": user["email"],
        "name": user["name"],
        "title": user["title"],
        "role": user["role"],
        "permissions": user.get("permissions", []),
        "iat": int(time.time()),
        "exp": int(time.time()) + (JWT_EXPIRATION_HOURS * 3600)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=JWT_ALGORITHM)


def decode_jwt_token(token):
    """Decode and validate a JWT token"""
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def token_required(f):
    """Decorator to require a valid JWT token"""
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization")
        if not auth_header:
            return jsonify({"error": "Authorization token required", "code": "AUTH_REQUIRED"}), 401
        
        parts = auth_header.split()
        if len(parts) != 2 or parts[0].lower() != "bearer":
            return jsonify({"error": "Invalid token header format. Use 'Bearer <token>'", "code": "INVALID_TOKEN_FORMAT"}), 401
        
        payload = decode_jwt_token(parts[1])
        if not payload:
            return jsonify({"error": "Token has expired or is invalid", "code": "TOKEN_INVALID"}), 401
        
        # Attach current user to request
        request.current_user = payload
        return f(*args, **kwargs)
    return decorated


def role_required(allowed_roles):
    """Decorator to enforce RBAC permissions"""
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            auth_header = request.headers.get("Authorization")
            if not auth_header:
                return jsonify({"error": "Authentication required", "code": "AUTH_REQUIRED"}), 401
            
            parts = auth_header.split()
            if len(parts) != 2 or parts[0].lower() != "bearer":
                return jsonify({"error": "Invalid token format", "code": "INVALID_TOKEN"}), 401
                
            payload = decode_jwt_token(parts[1])
            if not payload:
                return jsonify({"error": "Token expired or invalid", "code": "TOKEN_INVALID"}), 401

            user_role = payload.get("role")
            if user_role not in allowed_roles:
                return jsonify({
                    "error": f"Access forbidden: requires one of {allowed_roles} role(s)",
                    "user_role": user_role,
                    "required_roles": allowed_roles,
                    "code": "INSUFFICIENT_PERMISSIONS"
                }), 403
            
            request.current_user = payload
            return f(*args, **kwargs)
        return decorated
    return decorator


# ── Auth Endpoints ─────────────────────────────────────────────────────────────

@auth_bp.route("/login", methods=["POST"])
def login():
    """
    Authenticate user and return JWT token
    Body: {"email": "...", "password": "..."}
    """
    data = request.get_json(silent=True) or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    user = users_col.find_one({"email": email})
    if not user:
        # Fallback to in-memory defaults if Mongo was unreachable during startup
        user = next((u for u in DEFAULT_USERS if u["email"] == email), None)

    if not user or not check_password_hash(user["password_hash"], password):
        return jsonify({"error": "Invalid email or password credentials"}), 401

    token = generate_jwt_token(user)

    return jsonify({
        "message": "Login successful",
        "token": token,
        "user": {
            "email": user["email"],
            "name": user["name"],
            "title": user["title"],
            "role": user["role"],
            "permissions": user.get("permissions", [])
        }
    })


@auth_bp.route("/me", methods=["GET"])
@token_required
def get_current_user():
    """Return profile for the currently authenticated user"""
    return jsonify({
        "user": request.current_user
    })


@auth_bp.route("/users", methods=["GET"])
@role_required(["admin"])
def list_users():
    """List all user accounts in the system (Admin only)"""
    try:
        users = list(users_col.find({}, {"password_hash": 0, "_id": 0}))
        if not users:
            users = [{k: v for k, v in u.items() if k != "password_hash"} for u in DEFAULT_USERS]
        return jsonify({"users": users})
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@auth_bp.route("/demo-accounts", methods=["GET"])
def get_demo_accounts():
    """Returns demo accounts for quick evaluation in frontend"""
    return jsonify({
        "accounts": [
            {
                "email": "admin@earthscape.org",
                "name": "Dr. Aisha Khan",
                "role": "admin",
                "title": "Chief Climate Officer & System Admin",
                "password_hint": "admin123!",
                "permissions_summary": "Full Access: Execute MapReduce, User Admin, ML Tuning"
            },
            {
                "email": "analyst@earthscape.org",
                "name": "Bilal Ahmed",
                "role": "analyst",
                "title": "Environmental Data Analyst",
                "password_hint": "analyst123!",
                "permissions_summary": "Read-Only Access: View Analytics, ML Forecasts, HDFS Reports"
            }
        ]
    })
