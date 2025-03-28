from flask import Flask, jsonify
import RPi.GPIO as GPIO
import time

app = Flask(__name__)

# GPIO Configuration
IR_SENSOR_PIN_1 = 23
IR_SENSOR_PIN_2 = 24

GPIO.setmode(GPIO.BCM)
GPIO.setup(IR_SENSOR_PIN_1, GPIO.IN, pull_up_down=GPIO.PUD_UP)
GPIO.setup(IR_SENSOR_PIN_2, GPIO.IN, pull_up_down=GPIO.PUD_UP)

def read_sensors():
    # Read with debouncing
    s1 = not GPIO.input(IR_SENSOR_PIN_1)
    s2 = not GPIO.input(IR_SENSOR_PIN_2)
    time.sleep(0.05)  # Debounce delay
    s1 = s1 and (not GPIO.input(IR_SENSOR_PIN_1))
    s2 = s2 and (not GPIO.input(IR_SENSOR_PIN_2))
    return s1, s2

@app.route('/check-parcel', methods=['GET'])
def check_parcel():
    s1, s2 = read_sensors()
    return jsonify({
        "status": "success",
        "parcel_detected": s1 or s2,
        "sensor1": s1,
        "sensor2": s2
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5002)