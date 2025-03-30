#!/usr/bin/env python3
import RPi.GPIO as GPIO
import time

# Set up GPIO
GPIO.setmode(GPIO.BCM)
IR_SENSOR_PIN_1 = 23
IR_SENSOR_PIN_2 = 24

# Setup pins as input with pull-up resistors
GPIO.setup(IR_SENSOR_PIN_1, GPIO.IN, pull_up_down=GPIO.PUD_UP)
GPIO.setup(IR_SENSOR_PIN_2, GPIO.IN, pull_up_down=GPIO.PUD_UP)

def test_ir_sensors():
    print("IR Sensor Tester - Press CTRL+C to exit")
    print("Testing sensors on GPIO 23 and 24")
    print("Place an object in front of the sensors to test detection")
    print("----------------------------------------")
    
    try:
        while True:
            # Read sensor values (inverted because we're using pull-up)
            sensor1 = not GPIO.input(IR_SENSOR_PIN_1)
            sensor2 = not GPIO.input(IR_SENSOR_PIN_2)
            
            print(f"Sensor 1 (GPIO23): {'DETECTED' if sensor1 else 'CLEAR'} | "
                  f"Sensor 2 (GPIO24): {'DETECTED' if sensor2 else 'CLEAR'}", end='\r')
            
            time.sleep(0.1)  # Short delay to reduce CPU usage
            
    except KeyboardInterrupt:
        print("\nExiting tester...")
        GPIO.cleanup()

if __name__ == "__main__":
    test_ir_sensors()