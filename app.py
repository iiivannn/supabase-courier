from flask import Flask, jsonify, request
import RPi.GPIO as GPIO
import time

app = Flask(__name__)

# GPIO setup
SOLENOID_PIN = 18  # GPIO pin for the solenoid lock
IR_SENSOR_PIN = 24  # GPIO pin for the IR sensor

GPIO.setmode(GPIO.BCM)
GPIO.setup(SOLENOID_PIN, GPIO.OUT)
GPIO.setup(IR_SENSOR_PIN, GPIO.IN)

@app.route("/open-lock", methods=["POST"])
def open_lock():
    try:
        # Open the solenoid lock
        GPIO.output(SOLENOID_PIN, GPIO.HIGH)
        time.sleep(15)  # Keep the lock open for 15 seconds
        GPIO.output(SOLENOID_PIN, GPIO.LOW)
        return jsonify({"status": "success", "message": "Lock opened for 15 seconds"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})

@app.route("/check-parcel", methods=["GET"])
def check_parcel():
    try:
        # Check if the IR sensor detects a parcel
        if GPIO.input(IR_SENSOR_PIN) == GPIO.HIGH:
            return jsonify({"status": "success", "parcel_detected": True})
        else:
            return jsonify({"status": "success", "parcel_detected": False})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)