import os
import logging
from flask import Flask
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from flask_wtf import CSRFProtect
from flask import jsonify
from sqlalchemy import inspect

# Configure logging
logging.basicConfig(level=logging.DEBUG)

# Create the app
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "tMTwVU1XmT4sxJ9GAcG6JcvB+mWwk60XOZTzdgZeIi2JMC2MfOEY+7vdbQrcq1/lccOzcVVwHk/+NtgG0ORJOw==")  # Use your session secret here

# Configure database - make sure to provide the correct details
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL", 
    "postgresql://neondb_owner:npg_AC9o7XfkJPdS@ep-bitter-sunset-a58pjsr4.us-east-2.aws.neon.tech/neondb?sslmode=require")  # Update with correct details
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_recycle": 300,
    "pool_pre_ping": True,
}

# Configure ReCAPTCHA
app.config['RECAPTCHA_PUBLIC_KEY'] = os.environ.get('RECAPTCHA_PUBLIC_KEY', '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI')
app.config['RECAPTCHA_PRIVATE_KEY'] = os.environ.get('RECAPTCHA_PRIVATE_KEY', '6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe')
app.config['RECAPTCHA_OPTIONS'] = {'theme': 'light'}

# Initialize extensions
db = SQLAlchemy(app)
csrf = CSRFProtect(app)
login_manager = LoginManager(app)
login_manager.login_view = 'login'  # Specify the login route
login_manager.login_message = 'Please log in to access this page.'
login_manager.login_message_category = 'info'

# Enable CORS
CORS(app)

@login_manager.user_loader
def load_user(user_id):
    from models import User
    return User.query.get(int(user_id))

@app.route('/api/tables', methods=['GET'])
def get_tables():
    inspector = inspect(db.engine)
    tables = inspector.get_table_names()
    return jsonify(tables)