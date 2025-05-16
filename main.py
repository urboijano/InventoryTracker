from app import app, db  # noqa: F401
import models  # Initialize models
import routes  # Initialize routes

# Create all database tables
with app.app_context():
    db.create_all()
    models.init_categories()  # Initialize default categories

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
