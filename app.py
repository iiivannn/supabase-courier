from flask import Flask, jsonify, request
from flask_cors import CORS
import RPi.GPIO as GPIO
import atexit

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes to allow requests from your React app

# GPIO setup
FAN_PIN = 26  # GPIO26
SOLENOID_PIN = 18  # GPIO pin for the solenoid lock
IR_SENSOR_PIN_1 = 24  # First IR sensor pin
IR_SENSOR_PIN_2 = 23  # Second IR sensor pin
LED_PIN = 17  # Optional LED indicator

# Global variables
lock_status = False  # Track if lock is open

# Setup GPIO
GPIO.setmode(GPIO.BCM)
GPIO.setup(SOLENOID_PIN, GPIO.OUT)
GPIO.setup(IR_SENSOR_PIN_1, GPIO.IN)
GPIO.setup(IR_SENSOR_PIN_2, GPIO.IN)
GPIO.setup(LED_PIN, GPIO.OUT)
GPIO.setup(FAN_PIN, GPIO.OUT)

# Initialize pins
GPIO.output(SOLENOID_PIN, GPIO.HIGH)  # Lock is initially closed
GPIO.output(LED_PIN, GPIO.LOW)  # LED is initially off
GPIO.output(FAN_PIN, GPIO.HIGH)  # Ensure fan stays ON

def close_lock():
    global lock_status
    GPIO.output(SOLENOID_PIN, GPIO.HIGH)
    GPIO.output(LED_PIN, GPIO.LOW)
    lock_status = False
    print("[INFO] Lock closed")

@app.route("/open-lock", methods=["POST"])
def open_lock():
    global lock_status
    try:
        GPIO.output(SOLENOID_PIN, GPIO.LOW)
        GPIO.output(LED_PIN, GPIO.HIGH)
        lock_status = True
        print("[INFO] Lock opened")
        return jsonify({"status": "success", "message": "Lock opened"})
    except Exception as e:
        print(f"[ERROR] {str(e)}")
        return jsonify({"status": "error", "message": str(e)})

@app.route("/check-parcel", methods=["GET"])
def check_parcel():
    try:
        sensor1_detection = GPIO.input(IR_SENSOR_PIN_1) == GPIO.HIGH
        sensor2_detection = GPIO.input(IR_SENSOR_PIN_2) == GPIO.HIGH
        parcel_detected = sensor1_detection or sensor2_detection

        print(f"[INFO] Parcel check: Sensor1={sensor1_detection}, Sensor2={sensor2_detection}, Parcel Detected={parcel_detected}")

        if parcel_detected:
            print("[INFO] Parcel detected, closing the lock...")
            close_lock()

        return jsonify({
            "status": "success",
            "parcel_detected": parcel_detected,
            "sensor1_status": sensor1_detection,
            "sensor2_status": sensor2_detection
        })
    except Exception as e:
        print(f"[ERROR] {str(e)}")
        return jsonify({"status": "error", "message": str(e)})

@app.route("/lock-status", methods=["GET"])
def get_lock_status():
    try:
        print(f"[INFO] Lock Status: {'OPEN' if lock_status else 'CLOSED'}")
        return jsonify({"status": "success", "lock_open": lock_status})
    except Exception as e:
        print(f"[ERROR] {str(e)}")
        return jsonify({"status": "error", "message": str(e)})

@app.route("/fan-control", methods=["POST"])
def fan_control():
    try:
        data = request.json
        state = data.get("state", "").lower()
        
        if state == "on":
            GPIO.output(FAN_PIN, GPIO.HIGH)
            print("[INFO] Fan turned ON")
            return jsonify({"status": "success", "message": "Fan turned ON"})
        elif state == "off":
            GPIO.output(FAN_PIN, GPIO.LOW)
            print("[INFO] Fan turned OFF")
            return jsonify({"status": "success", "message": "Fan turned OFF"})
        else:
            print("[ERROR] Invalid fan state")
            return jsonify({"status": "error", "message": "Invalid state. Use 'on' or 'off'."})
    except Exception as e:
        print(f"[ERROR] {str(e)}")
        return jsonify({"status": "error", "message": str(e)})

@app.route("/health", methods=["GET"])
def health_check():
    print("[INFO] Health check - Server is running")
    return jsonify({"status": "success", "message": "ParSafe backend is running"})

# Cleanup GPIO when the app exits
def cleanup():
    print("[INFO] Cleaning up GPIO...")
    GPIO.cleanup()

atexit.register(cleanup)

if __name__ == "__main__":
    try:
        print("[INFO] Starting Flask server on port 5000...")
        app.run(host="0.0.0.0", port=5000, threaded=True)
    except KeyboardInterrupt:
        print("[INFO] Shutting down server...")
        cleanup()


#To run //  $ source ~/parsafe_env/bin/activate
# python app.py