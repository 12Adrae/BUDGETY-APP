from flask import Flask
from flask_cors import CORS
from routes import register_routes  # Import the function to register routes


# After your app is initialized:

app = Flask(__name__)
app.secret_key = 'your_secret_key'  # Replace with a secure key
CORS(app, supports_credentials=True)


register_routes(app)


if __name__ == '__main__':
    app.run(debug=True)