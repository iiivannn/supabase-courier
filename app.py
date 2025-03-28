from flask import Flask, jsonify
from flask_cors import CORS
import RPi.GPIO as GPIO
import time
import threading
import atexit

app = Flask(__name__)
CORS(app)

# GPIO Configuration
SOLENOID_PIN = 18
IR_SENSOR_1 = 23
IR_SENSOR_2 = 24

# Initialize GPIO
GPIO.setmode(GPIO.BCM)
GPIO.setup(SOLENOID_PIN, GPIO.OUT)
GPIO.setup(IR_SENSOR_1, GPIO.IN, pull_up_down=GPIO.PUD_UP)
GPIO.setup(IR_SENSOR_2, GPIO.IN, pull_up_down=GPIO.PUD_UP)

# Initial state
GPIO.output(SOLENOID_PIN, GPIO.HIGH)  # Start locked
lock_status = False
parcel_detected = False
last_detection_time = 0

# Thread-safe lock
data_lock = threading.Lock()

def read_sensors():
    """Read sensors with hardware debouncing"""
    s1 = not GPIO.input(IR_SENSOR_1)
    s2 = not GPIO.input(IR_SENSOR_2)
    time.sleep(0.05)  # Debounce period
    return (s1 and not GPIO.input(IR_SENSOR_1)), (s2 and not GPIO.input(IR_SENSOR_2))

def monitor_sensors():
    """Continuous sensor monitoring thread"""
    global parcel_detected, last_detection_time
    
    while True:
        try:
            s1, s2 = read_sensors()
            current_detection = s1 or s2
            
            with data_lock:
                parcel_detected = current_detection
                if current_detection:
                    last_detection_time = time.time()
                    
                    # # Auto-close if lock is open and parcel detected
                    # if not lock_status:
                    #     close_lock()
                        
        except Exception as e:
            print(f"Sensor monitoring error: {e}")
            
        time.sleep(0.3)  # 300ms between checks

# Start sensor thread
sensor_thread = threading.Thread(target=monitor_sensors)
sensor_thread.daemon = True
sensor_thread.start()


def close_lock():
    """Close the lock and ensure it stays closed."""
    global lock_status
    with data_lock:
        if lock_status:
            GPIO.output(SOLENOID_PIN, GPIO.HIGH)
            lock_status = False
            time.sleep(1.0)  # Small delay to ensure stability after closing
            print("[LOCK] Lock closed")

@app.route('/open-lock', methods=['POST'])
def open_lock():
    """Open the lock endpoint"""
    global lock_status
    try:
        with data_lock:
            GPIO.output(SOLENOID_PIN, GPIO.LOW)
            lock_status = True
        return jsonify({
            "status": "success",
            "lock_open": True,
            "message": "Lock opened"
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500



@app.route('/close-lock', methods=['POST'])
def api_close_lock():
    """Close the lock endpoint"""
    try:
        close_lock()
        return jsonify({
            "status": "success",
            "lock_open": False,
            "message": "Lock closed"
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@app.route('/check-parcel', methods=['GET'])
def check_parcel():
    """Check parcel status endpoint"""
    try:
        with data_lock:
            return jsonify({
                "status": "success",
                "parcel_detected": parcel_detected,
                "sensor1": not GPIO.input(IR_SENSOR_1),
                "sensor2": not GPIO.input(IR_SENSOR_2),
                "timestamp": last_detection_time
            })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@app.route('/lock-status', methods=['GET'])
def get_lock_status():
    """Lock status endpoint"""
    try:
        with data_lock:
            return jsonify({
                "status": "success",
                "lock_open": lock_status,
                "timestamp": time.time()
            })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

def cleanup():
    """Cleanup GPIO resources"""
    GPIO.cleanup()
    print("[SYSTEM] GPIO cleaned up")

atexit.register(cleanup)

if __name__ == '__main__':
    try:
        print("[SYSTEM] Starting ParSafe server...")
        app.run(host='0.0.0.0', port=5000, threaded=True)
    except KeyboardInterrupt:
        print("\n[SYSTEM] Server shutting down...")
    finally:
        cleanup() 

# working version