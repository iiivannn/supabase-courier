from flask import Flask, jsonify
import requests

app = Flask(__name__)

SERVICES = {
    'solenoid': 'http://localhost:5001',
    'ir': 'http://localhost:5002'
}

@app.route('/open-lock', methods=['POST'])
def open_lock():
    try:
        response = requests.post(f"{SERVICES['solenoid']}/unlock")
        return response.json()
    except requests.exceptions.RequestException as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/check-parcel', methods=['GET'])
def check_parcel():
    try:
        # Get sensor status
        ir_response = requests.get(f"{SERVICES['ir']}/check-parcel")
        ir_data = ir_response.json()
        
        # Auto-lock if parcel detected
        if ir_data.get('parcel_detected'):
            requests.post(f"{SERVICES['solenoid']}/lock")
            
        return jsonify(ir_data)
    except requests.exceptions.RequestException as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/lock-status', methods=['GET'])
def lock_status():
    try:
        response = requests.get(f"{SERVICES['solenoid']}/lock-status")
        return response.json()
    except requests.exceptions.RequestException as e:
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
    