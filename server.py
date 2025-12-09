from flask import Flask, Response, render_template_string
import cv2

app = Flask(__name__)

# Open camera (0 = rear/primary on laptops, mobile external cam may differ)
camera = cv2.VideoCapture(0)

# Simple HTML templates
camera_html = """
<!DOCTYPE html>
<html>
<body>
<h2>Device B Camera Stream</h2>
<img src="/video_feed" width="90%">
</body>
</html>
"""

viewer_html = """
<!DOCTYPE html>
<html>
<body>
<h2>Device A Viewer</h2>
<img src="/video_feed" width="90%">
</body>
</html>
"""


def generate_frames():
    while True:
        success, frame = camera.read()
        if not success:
            break
        else:
            ret, buffer = cv2.imencode('.jpg', frame)
            frame = buffer.tobytes()

            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')


@app.route('/video_feed')
def video_feed():
    return Response(generate_frames(),
                    mimetype='multipart/x-mixed-replace; boundary=frame')


@app.route('/camera.html')
def camera_page():
    return render_template_string(camera_html)


@app.route('/viewer.html')
def viewer_page():
    return render_template_string(viewer_html)


if __name__ == '__main__':
    # 0.0.0.0 = accessible to WiFi devices (Device B)
    app.run(host='0.0.0.0', port=5000, debug=False, threaded=True)
