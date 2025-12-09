from flask import Flask, Response, request, render_template_string
import base64

app = Flask(__name__)

# HTML: Device B camera page
camera_html = """
<!DOCTYPE html>
<html>
<body>
<h2>Device B: Camera Stream</h2>
<video id="cam" autoplay playsinline width="300"></video>

<script>
let video = document.getElementById('cam');

navigator.mediaDevices.getUserMedia({ video: true }).then(stream => {
    video.srcObject = stream;

    let canvas = document.createElement('canvas');
    let ctx = canvas.getContext('2d');

    setInterval(() => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);

        fetch('/upload_frame', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({frame: canvas.toDataURL("image/jpeg")})
        });

    }, 100);
});
</script>
</body>
</html>
"""

# HTML: Device A viewer page
viewer_html = """
<!DOCTYPE html>
<html>
<body>
<h2>Viewer</h2>
<img src="/stream" width="100%">
</body>
</html>
"""

latest_frame = None

@app.route("/camera.html")
def camera_page():
    return render_template_string(camera_html)

@app.route("/viewer.html")
def viewer_page():
    return render_template_string(viewer_html)

@app.route("/upload_frame", methods=["POST"])
def upload_frame():
    global latest_frame
    data = request.json["frame"].split(",")[1]
    latest_frame = base64.b64decode(data)
    return "OK"

def generate_stream():
    global latest_frame
    while True:
        if latest_frame is not None:
            yield (b"--frame\r\n"
                   b"Content-Type: image/jpeg\r\n\r\n" +
                   latest_frame + b"\r\n")

@app.route("/stream")
def stream():
    return Response(generate_stream(), mimetype="multipart/x-mixed-replace; boundary=frame")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, threaded=True)
