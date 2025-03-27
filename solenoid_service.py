from flask import Flask, jsonify
import RPi.GPIO as GPIO
import atexit

app = Flask(__name__)

# GPIO Configuration
SOLENOID_PIN = 18
GPIO.setmode(GPIO.BCM)
GPIO.setup(SOLENOID_PIN, GPIO.OUT)
GPIO.output(SOLENOID_PIN, GPIO.HIGH)  # Start locked

@app.route('/lock', methods=['POST'])
def lock():
    GPIO.output(SOLENOID_PIN, GPIO.HIGH)
    return jsonify({"status": "success", "locked": True})

@app.route('/unlock', methods=['POST'])
def unlock():
    GPIO.output(SOLENOID_PIN, GPIO.LOW)
    return jsonify({"status": "success", "locked": False})

@app.route('/lock-status', methods=['GET'])
def lock_status():
    status = GPIO.input(SOLENOID_PIN)
    return jsonify({"status": "success", "locked": bool(status)})

def cleanup():
    GPIO.cleanup()

atexit.register(cleanup)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001)