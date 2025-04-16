from flask import jsonify, request, session, redirect, url_for, render_template
import sqlite3
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime

# Helper function for database connection
def get_db_connection():
    conn = sqlite3.connect('database.db')
    conn.row_factory = sqlite3.Row  # Enable column access by name
    return conn

# API routes
def register_routes(app):
    # Health check route
    @app.route('/api/health', methods=['GET'])
    def health_check():
        return jsonify({'status': 'healthy'}), 200

    # User registration route
    @app.route('/api/register', methods=['POST'])
    def register():
        try:
            data = request.json
            conn = get_db_connection()
            c = conn.cursor()

            # Check if email already exists
            c.execute('SELECT * FROM users WHERE email = ?', (data['email'],))
            if c.fetchone():
                conn.close()
                return jsonify({'error': 'Email already registered'}), 400

            # Hash the password
            hashed_password = generate_password_hash(data['password'])

            # Insert new user
            c.execute(
                'INSERT INTO users (full_name, email, password, university, age) VALUES (?, ?, ?, ?, ?)',
                (data['fullName'], data['email'], hashed_password, data.get('university', ''), data.get('age', 0))
            )
            conn.commit()
            user_id = c.lastrowid
            conn.close()

            # Create session
            session['user_id'] = user_id
            session['full_name'] = data['fullName']

            return jsonify({'id': user_id, 'full_name': data['fullName'], 'email': data['email']}), 201
        except Exception as e:
            print(f"Error during registration: {str(e)}")
            return jsonify({'error': 'An error occurred during registration'}), 500

    # User login route
    @app.route('/api/login', methods=['POST'])
    def login():
        try:
            data = request.json
            conn = get_db_connection()
            c = conn.cursor()

            # Fetch user by email
            c.execute('SELECT id, full_name, email, password FROM users WHERE email = ?', (data['email'],))
            user = c.fetchone()
            conn.close()

            if user and check_password_hash(user['password'], data['password']):
                session['user_id'] = user['id']
                session['full_name'] = user['full_name']
                return jsonify({'id': user['id'], 'full_name': user['full_name'], 'email': user['email']}), 200

            return jsonify({'error': 'Invalid email or password'}), 401
        except Exception as e:
            print(f"Error during login: {str(e)}")
            return jsonify({'error': 'An error occurred during login'}), 500

    # User logout route
    @app.route('/api/logout', methods=['POST'])
    def logout():
        session.clear()
        return jsonify({'message': 'Logged out successfully'}), 200

    # Get budget route
    @app.route('/api/budget', methods=['GET'])
    def get_budget():
        if 'user_id' not in session:
            return jsonify({'error': 'Unauthorized'}), 401

        try:
            user_id = session['user_id']
            conn = get_db_connection()
            c = conn.cursor()

            # Get the latest budget
            c.execute('SELECT * FROM budgets WHERE user_id = ? ORDER BY id DESC LIMIT 1', (user_id,))
            budget_row = c.fetchone()

            budget = None
            if budget_row:
                budget = {
                    'id': budget_row['id'],
                    'totalBudget': budget_row['total_budget'],
                    'startDate': budget_row['start_date'],
                    'endDate': budget_row['end_date']
                }

            # Get categories
            c.execute('SELECT * FROM categories WHERE user_id = ?', (user_id,))
            categories = [
                {'id': row['id'], 'name': row['name'], 'allocated': row['allocated'], 'spent': row['spent']}
                for row in c.fetchall()
            ]

            conn.close()
            return jsonify({'budget': budget, 'categories': categories}), 200
        except Exception as e:
            print(f"Error fetching budget: {str(e)}")
            return jsonify({'error': 'An error occurred while fetching the budget'}), 500

    # Save budget route
    @app.route('/api/budget', methods=['POST'])
    def save_budget():
        if 'user_id' not in session:
            return jsonify({'error': 'Unauthorized'}), 401

        try:
            data = request.json
            user_id = session['user_id']
            conn = get_db_connection()
            c = conn.cursor()

            # Save or update budget
            c.execute(
                'INSERT OR REPLACE INTO budgets (user_id, total_budget, start_date, end_date) VALUES (?, ?, ?, ?)',
                (user_id, data['totalBudget'], data['startDate'], data['endDate'])
            )

            # Update categories
            if 'categories' in data and data['categories']:
                c.execute('SELECT id, name FROM categories WHERE user_id = ?', (user_id,))
                existing_categories = {row['name']: row['id'] for row in c.fetchall()}

                for category in data['categories']:
                    if category['name'] in existing_categories:
                        c.execute(
                            'UPDATE categories SET allocated = ?, spent = ? WHERE id = ?',
                            (category['allocated'], category['spent'], existing_categories[category['name']])
                        )
                    else:
                        c.execute(
                            'INSERT INTO categories (user_id, name, allocated, spent) VALUES (?, ?, ?, ?)',
                            (user_id, category['name'], category['allocated'], category['spent'])
                        )

            conn.commit()
            conn.close()
            return jsonify({'message': 'Budget saved successfully'}), 200
        except Exception as e:
            print(f"Error saving budget: {str(e)}")
            return jsonify({'error': 'An error occurred while saving the budget'}), 500

    # Add expense route
    @app.route('/api/expenses', methods=['POST'])
    def add_expense():
        if 'user_id' not in session:
            return jsonify({'error': 'Unauthorized'}), 401

        try:
            data = request.json
            user_id = session['user_id']
            conn = get_db_connection()
            c = conn.cursor()

            # Find category ID
            c.execute('SELECT id FROM categories WHERE user_id = ? AND name = ?', (user_id, data['category']))
            category = c.fetchone()

            if not category:
                conn.close()
                return jsonify({'error': 'Category not found'}), 404

            category_id = category['id']

            # Add expense
            c.execute(
                'INSERT INTO expenses (user_id, category_id, amount, description, date) VALUES (?, ?, ?, ?, ?)',
                (user_id, category_id, data['amount'], data.get('description', ''), data['date'])
            )

            # Update category spent amount
            c.execute('UPDATE categories SET spent = spent + ? WHERE id = ?', (data['amount'], category_id))

            conn.commit()
            conn.close()
            return jsonify({'message': 'Expense added successfully'}), 201
        except Exception as e:
            print(f"Error adding expense: {str(e)}")
            return jsonify({'error': 'An error occurred while adding the expense'}), 500

    # Delete category route
    @app.route('/api/categories/<int:category_id>', methods=['DELETE'])
    def delete_category(category_id):
        if 'user_id' not in session:
            return jsonify({'error': 'Unauthorized'}), 401

        try:
            user_id = session['user_id']
            conn = get_db_connection()
            c = conn.cursor()

            # Check if the category belongs to the current user
            c.execute('SELECT * FROM categories WHERE id = ? AND user_id = ?', (category_id, user_id))
            category = c.fetchone()

            if not category:
                conn.close()
                return jsonify({'error': 'Category not found or not authorized'}), 404

            # Delete expenses related to this category
            c.execute('DELETE FROM expenses WHERE category_id = ?', (category_id,))

            # Delete the category
            c.execute('DELETE FROM categories WHERE id = ?', (category_id,))

            conn.commit()
            conn.close()
            return jsonify({'message': 'Category deleted successfully'}), 200
        except Exception as e:
            print(f"Error deleting category: {str(e)}")
            return jsonify({'error': 'An error occurred while deleting the category'}), 500

    # Allocate budget to category route
    @app.route('/api/categories/allocate', methods=['POST'])
    def allocate_budget():
        if 'user_id' not in session:
            return jsonify({'error': 'Unauthorized'}), 401

        try:
            data = request.json
            user_id = session['user_id']
            category_id = data.get('categoryId')
            allocated = data.get('allocated')

            if not category_id or allocated is None:
                return jsonify({'error': 'Missing required fields'}), 400

            conn = get_db_connection()
            c = conn.cursor()

            # Check if the category belongs to the current user
            c.execute('SELECT * FROM categories WHERE id = ? AND user_id = ?', (category_id, user_id))
            category = c.fetchone()

            if not category:
                conn.close()
                return jsonify({'error': 'Category not found or not authorized'}), 404

            # Update the allocated amount
            c.execute('UPDATE categories SET allocated = ? WHERE id = ?', (allocated, category_id))

            conn.commit()
            conn.close()
            return jsonify({'message': 'Budget allocated successfully'}), 200
        except Exception as e:
            print(f"Error allocating budget: {str(e)}")
            return jsonify({'error': 'An error occurred while updating allocation'}), 500

    # Home page route
    @app.route('/')
    def home():
        return render_template('index.html')

    # Dashboard route
    @app.route('/dashboard')
    def dashboard():
        if 'user_id' not in session:
            return redirect(url_for('home'))
        return render_template('dashboard.html')