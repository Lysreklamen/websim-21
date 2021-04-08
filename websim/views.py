from .server import app
from flask import render_template, jsonify, send_file, request, redirect
from pathlib import Path
import re
import logging
import jwt
from functools import wraps

from .sign import Sign, SIGNS_DIR
from . import auth

logger = logging.getLogger(__name__)

def is_authenticated():
    auth_token = request.cookies.get("access-token", "")
    return auth.is_authenticated(auth_token)

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        password = request.form.get("password", "")
        if auth.check_password(password):
            resp = redirect("/")
            resp.set_cookie("access-token", value=auth.generate_auth_token(), httponly=True, max_age=24*60*60)
            return resp
        return render_template("login.html", message="Wrong passwod!")
    return render_template("login.html")

@app.route("/simulator")
def simulator():
    return render_template("simulator.html")

@app.route("/sign_debug")
def sign_debug():
    return render_template("sign_debug.html")


#########################################################
# The API endpoints are designed such that it would be
# possible to "render" a static version of all the view
# and host the entire simulator statically
########################################################


@app.route("/api/signs.json")
def api_sign_list():
    """
    API for listing available signs.
    """
    authenticated = is_authenticated()

    signs = []
    for f  in SIGNS_DIR.iterdir():
        if not f.is_dir():
            continue
        if f.name.startswith('.'):
            continue
        
        try:
            # If creating a sign object fails this is not a valid sign
            sign = Sign(f.name)
            if sign.public:
                signs.append(f.name)
            else:
                if authenticated:
                    signs.append(f.name)
            
        except ValueError:
            logger.warning(f"The directory signs/{f.name} could not be validated as a valid name. ", exc_info=True)

    return jsonify(signs)

def sign_api(f):
    """
    A decorator which handles all APIs targeted for a specific sign.
    It handles creating the Sign object and returning errors if the sign does not
    exist or the sign requires authentication
    """
    @wraps(f)
    def sign_api_decorated(*args, **kwargs):
        if 'sign_name' not in kwargs:
            return "sign name not provied", 400
        sign_name = kwargs['sign_name']
        del kwargs['sign_name']
        try: 
            # The below verification should avoid any directory traversal bugs
            sign = Sign(sign_name)
            if not sign.public and not is_authenticated():
                logger.warn("User tried to access private sign")
                raise ValueError("user tried to access private sign!")
        except ValueError:
            return "invalid sign name", 400
        return f(sign, *args, **kwargs)
    return sign_api_decorated

@app.route("/api/signs/<sign_name>/scene.json")
@sign_api
def api_sign_scene(sign: Sign):  
    return send_file(sign.scene_def)


@app.route("/api/signs/<sign_name>/assets/<asset_name>")
@sign_api
def api_sign_asset(sign: Sign, asset_name: str):
    return send_file(sign.get_asset(asset_name))


@app.route("/api/signs/<sign_name>/pgms.json")
@sign_api
def api_sign_pgms(sign: Sign):
    out = []
    for f in sign.list_pgms():
        out.append(f.name)
    return jsonify(out)

@app.route("/api/signs/<sign_name>/pgms/<pgm_name>")
@sign_api
def api_sign_get_pgm(sign: Sign, pgm_name: str):
    return send_file(sign.get_pgm(pgm_name), mimetype='text/plain')
