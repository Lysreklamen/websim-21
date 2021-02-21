from .server import app

# This app should be launched using uwsgi for prod.
# This entrypoint is just for development use
app.run(debug=True)
