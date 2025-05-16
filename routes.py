from flask import render_template, request, jsonify, redirect, url_for, flash
from flask_login import login_user, logout_user, login_required, current_user
from app import app, db
from models import inventory_manager, User, get_categories as get_categories_model
from forms import LoginForm, RegistrationForm

# Authentication Routes
@app.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))
    
    form = LoginForm()
    if form.validate_on_submit():
        user = User.query.filter_by(username=form.username.data).first()
        if user is None or not user.check_password(form.password.data):
            flash('Invalid username or password', 'danger')
            return redirect(url_for('login'))
        
        login_user(user, remember=form.remember_me.data)
        flash(f'Welcome back, {user.username}!', 'success')
        
        # Redirect to the page the user wanted to access
        next_page = request.args.get('next')
        if not next_page or not next_page.startswith('/'):
            next_page = url_for('dashboard')
        return redirect(next_page)
    
    return render_template('login.html', form=form)

@app.route('/register', methods=['GET', 'POST'])
def register():
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))
    
    form = RegistrationForm()
    if form.validate_on_submit():
        user = User(username=form.username.data, email=form.email.data)
        user.set_password(form.password.data)
        
        # Make the first user an admin
        if User.query.count() == 0:
            user.is_admin = True
        
        db.session.add(user)
        db.session.commit()
        
        flash('Registration successful! You can now log in.', 'success')
        return redirect(url_for('login'))
    
    return render_template('register.html', form=form)

@app.route('/logout')
@login_required
def logout():
    logout_user()
    flash('You have been logged out.', 'info')
    return redirect(url_for('login'))

# Web Routes
@app.route('/')
def index():
    return redirect(url_for('dashboard'))

@app.route('/dashboard')
@login_required
def dashboard():
    return render_template('dashboard.html')

@app.route('/inventory')
@login_required
def inventory():
    return render_template('inventory.html')

@app.route('/transactions')
@login_required
def transactions():
    return render_template('transactions.html')

@app.route('/reports')
@login_required
def reports():
    return render_template('reports.html')

# API Routes
@app.route('/api/categories', methods=['GET'])
def get_categories():
    categories = get_categories_model()
    return jsonify({"categories": categories})

@app.route('/api/inventory', methods=['GET'])
@login_required
def get_inventory():
    search = request.args.get('search', '')
    category = request.args.get('category', '')
    stock_level = request.args.get('stock_level', '')
    
    items = inventory_manager.get_items(search, category, stock_level)
    return jsonify({"items": items})

@app.route('/api/inventory', methods=['POST'])
@login_required
def add_inventory_item():
    data = request.json
    
    # Validate required fields
    required_fields = ['name', 'sku', 'description', 'category', 'price', 'quantity']
    for field in required_fields:
        if field not in data:
            return jsonify({"error": f"Missing required field: {field}"}), 400
    
    item = inventory_manager.add_item(
        name=data['name'],
        sku=data['sku'],
        description=data['description'],
        category=data['category'],
        price=data['price'],
        quantity=data['quantity']
    )
    
    return jsonify({"message": "Item added successfully", "item": item})

@app.route('/api/inventory/<item_id>', methods=['GET'])
@login_required
def get_inventory_item(item_id):
    item = inventory_manager.get_item(item_id)
    if item:
        return jsonify({"item": item})
    return jsonify({"error": "Item not found"}), 404

@app.route('/api/inventory/<item_id>', methods=['PUT'])
@login_required
def update_inventory_item(item_id):
    data = request.json
    
    item = inventory_manager.update_item(item_id, data)
    if item:
        return jsonify({"message": "Item updated successfully", "item": item})
    return jsonify({"error": "Item not found"}), 404

@app.route('/api/inventory/<item_id>', methods=['DELETE'])
@login_required
def delete_inventory_item(item_id):
    item = inventory_manager.delete_item(item_id)
    if item:
        return jsonify({"message": "Item deleted successfully"})
    return jsonify({"error": "Item not found"}), 404

@app.route('/api/transactions', methods=['GET'])
@login_required
def get_transactions():
    item_id = request.args.get('item_id', None)
    transactions = inventory_manager.get_transactions(item_id)
    return jsonify({"transactions": transactions})

@app.route('/api/transactions', methods=['POST'])
@login_required
def add_transaction():
    data = request.json
    
    # Validate required fields
    required_fields = ['item_id', 'type', 'quantity']
    for field in required_fields:
        if field not in data:
            return jsonify({"error": f"Missing required field: {field}"}), 400
    
    notes = data.get('notes', '')
    
    transaction = inventory_manager.add_transaction(
        item_id=data['item_id'],
        transaction_type=data['type'],
        quantity=data['quantity'],
        user_id=current_user.id if current_user.is_authenticated else None,
        notes=notes
    )
    
    if transaction and 'error' in transaction:
        return jsonify({"error": transaction['error']}), 400
    
    return jsonify({"message": "Transaction added successfully", "transaction": transaction})

@app.route('/api/dashboard', methods=['GET'])
@login_required
def get_dashboard_data():
    summary = inventory_manager.get_inventory_summary()
    return jsonify(summary)

@app.route('/api/reports/<report_type>', methods=['GET'])
@login_required
def get_report(report_type):
    data = inventory_manager.get_report_data(report_type)
    if data:
        return jsonify(data)
    return jsonify({"error": "Invalid report type"}), 400
