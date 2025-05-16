import json
import uuid
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import UserMixin
from app import db

# User model for authentication
class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    is_admin = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def __repr__(self):
        return f'<User {self.username}>'

# Database models for inventory management
class Category(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(64), unique=True, nullable=False)
    items = db.relationship('Item', backref='category_ref', lazy='dynamic')

    def __repr__(self):
        return f'<Category {self.name}>'

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name
        }

class Item(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    sku = db.Column(db.String(50), unique=True, nullable=False)
    description = db.Column(db.Text, nullable=True)
    category_id = db.Column(db.Integer, db.ForeignKey('category.id'), nullable=False)
    price = db.Column(db.Float, nullable=False)
    quantity = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    transactions = db.relationship('Transaction', backref='item_ref', lazy='dynamic')

    def __repr__(self):
        return f'<Item {self.name}>'

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'sku': self.sku,
            'description': self.description,
            'category': self.category_ref.name,
            'price': self.price,
            'quantity': self.quantity,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

class Transaction(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    item_id = db.Column(db.Integer, db.ForeignKey('item.id'), nullable=False)
    type = db.Column(db.String(10), nullable=False)  # 'in' or 'out'
    quantity = db.Column(db.Integer, nullable=False)
    previous_quantity = db.Column(db.Integer, nullable=False)
    new_quantity = db.Column(db.Integer, nullable=False)
    notes = db.Column(db.Text, nullable=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    user = db.relationship('User', backref='transactions')

    def __repr__(self):
        return f'<Transaction {self.id} {self.type}>'

    def to_dict(self):
        return {
            'id': self.id,
            'item_id': self.item_id,
            'item_name': self.item_ref.name,
            'sku': self.item_ref.sku,
            'type': self.type,
            'quantity': self.quantity,
            'previous_quantity': self.previous_quantity,
            'new_quantity': self.new_quantity,
            'notes': self.notes,
            'user': self.user.username if self.user else None,
            'timestamp': self.timestamp.isoformat()
        }

# Business logic for inventory management
class InventoryManager:
    """Database-backed inventory management"""
    
    @staticmethod
    def add_item(name, sku, description, category, price, quantity):
        """Add a new inventory item"""
        # Get or create category
        category_obj = Category.query.filter_by(name=category).first()
        if not category_obj:
            category_obj = Category(name=category)
            db.session.add(category_obj)
            db.session.flush()
            
        # Create new item
        new_item = Item(
            name=name,
            sku=sku,
            description=description,
            category_id=category_obj.id,
            price=float(price),
            quantity=int(quantity)
        )
        
        db.session.add(new_item)
        db.session.commit()
        
        return new_item.to_dict()
    
    @staticmethod
    def update_item(item_id, data):
        """Update an existing inventory item"""
        item = Item.query.get(item_id)
        
        if not item:
            return None
            
        # Update fields if provided
        if 'name' in data:
            item.name = data['name']
        if 'sku' in data:
            item.sku = data['sku']
        if 'description' in data:
            item.description = data['description']
        if 'category' in data:
            category_obj = Category.query.filter_by(name=data['category']).first()
            if not category_obj:
                category_obj = Category(name=data['category'])
                db.session.add(category_obj)
                db.session.flush()
            item.category_id = category_obj.id
        if 'price' in data:
            item.price = float(data['price'])
        if 'quantity' in data:
            item.quantity = int(data['quantity'])
            
        db.session.commit()
        
        return item.to_dict()
    
    @staticmethod
    def delete_item(item_id):
        """Delete an inventory item"""
        item = Item.query.get(item_id)
        
        if not item:
            return None
            
        item_dict = item.to_dict()
        db.session.delete(item)
        db.session.commit()
        
        return item_dict
    
    @staticmethod
    def get_item(item_id):
        """Get a specific inventory item"""
        item = Item.query.get(item_id)
        
        if not item:
            return None
            
        return item.to_dict()
    
    @staticmethod
    def get_items(search=None, category=None, stock_level=None):
        """Get filtered inventory items"""
        query = Item.query
        
        # Apply search filter
        if search:
            search = f"%{search.lower()}%"
            query = query.filter(
                db.or_(
                    db.func.lower(Item.name).like(search),
                    db.func.lower(Item.sku).like(search),
                    db.func.lower(Item.description).like(search)
                )
            )
        
        # Apply category filter
        if category and category != "All":
            category_obj = Category.query.filter_by(name=category).first()
            if category_obj:
                query = query.filter(Item.category_id == category_obj.id)
        
        # Apply stock level filter
        if stock_level:
            if stock_level == "Low":
                query = query.filter(Item.quantity <= 10, Item.quantity > 0)
            elif stock_level == "Out":
                query = query.filter(Item.quantity == 0)
            elif stock_level == "In":
                query = query.filter(Item.quantity > 0)
        
        items = query.all()
        return [item.to_dict() for item in items]
    
    @staticmethod
    def add_transaction(item_id, transaction_type, quantity, user_id=None, notes=""):
        """Add a new stock transaction"""
        item = Item.query.get(item_id)
        
        if not item:
            return None
        
        # Update item quantity
        previous_quantity = item.quantity
        
        if transaction_type == "in":
            item.quantity += int(quantity)
        elif transaction_type == "out":
            if item.quantity < int(quantity):
                return {"error": "Not enough stock"}
            item.quantity -= int(quantity)
        
        # Record the transaction
        transaction = Transaction(
            item_id=item.id,
            type=transaction_type,
            quantity=int(quantity),
            previous_quantity=previous_quantity,
            new_quantity=item.quantity,
            user_id=user_id,
            notes=notes
        )
        
        db.session.add(transaction)
        db.session.commit()
        
        return transaction.to_dict()
    
    @staticmethod
    def get_transactions(item_id=None):
        """Get filtered transactions"""
        if item_id:
            transactions = Transaction.query.filter_by(item_id=item_id).order_by(Transaction.timestamp.desc()).all()
        else:
            transactions = Transaction.query.order_by(Transaction.timestamp.desc()).all()
            
        return [t.to_dict() for t in transactions]
    
    @staticmethod
    def get_inventory_summary():
        """Get inventory summary for dashboard"""
        total_items = Item.query.count()
        total_value = db.session.query(db.func.sum(Item.price * Item.quantity)).scalar() or 0
        low_stock_items = Item.query.filter(Item.quantity <= 10, Item.quantity > 0).count()
        out_of_stock_items = Item.query.filter(Item.quantity == 0).count()
        
        # Category distribution
        categories = Category.query.all()
        category_counts = {}
        
        for category in categories:
            count = Item.query.filter_by(category_id=category.id).count()
            if count > 0:
                category_counts[category.name] = count
        
        # Recent transactions
        recent_transactions = Transaction.query.order_by(Transaction.timestamp.desc()).limit(5).all()
        
        return {
            "total_items": total_items,
            "total_value": float(total_value),
            "low_stock_items": low_stock_items,
            "out_of_stock_items": out_of_stock_items,
            "category_distribution": category_counts,
            "recent_transactions": [t.to_dict() for t in recent_transactions]
        }
    
    @staticmethod
    def get_report_data(report_type):
        """Get data for reports"""
        if report_type == "inventory_value":
            # Calculate inventory value by category
            categories = Category.query.all()
            category_values = {}
            
            for category in categories:
                value = db.session.query(db.func.sum(Item.price * Item.quantity)).filter(Item.category_id == category.id).scalar() or 0
                if value > 0:
                    category_values[category.name] = float(value)
            
            return {
                "labels": list(category_values.keys()),
                "data": list(category_values.values())
            }
            
        elif report_type == "stock_levels":
            # Calculate stock levels for top items
            items = Item.query.order_by(Item.quantity.desc()).limit(10).all()
            
            return {
                "labels": [item.name for item in items],
                "data": [item.quantity for item in items]
            }
            
        elif report_type == "transaction_history":
            # Count transactions by type (in/out)
            in_count = Transaction.query.filter_by(type="in").count()
            out_count = Transaction.query.filter_by(type="out").count()
            
            return {
                "labels": ["Stock In", "Stock Out"],
                "data": [in_count, out_count]
            }
            
        return None

# Create global instance of the inventory manager
inventory_manager = InventoryManager()

# Get all categories
def get_categories():
    categories = Category.query.order_by(Category.name).all()
    return [category.name for category in categories]

# Initialize default categories if none exist
def init_categories():
    default_categories = ["Electronics", "Office Supplies", "Furniture", "Raw Materials", "Tools", "Food & Beverage"]
    
    for category_name in default_categories:
        if not Category.query.filter_by(name=category_name).first():
            category = Category(name=category_name)
            db.session.add(category)
    
    db.session.commit()
