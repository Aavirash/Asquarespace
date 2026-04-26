const previewEl = document.getElementById('camera-preview');
const launchScreen = document.getElementById('launch-screen');
const cameraNameEl = document.getElementById('camera-name');
const statusEl = document.getElementById('launch-status');
const startBtn = document.getElementById('start-btn');
const nextBtn = document.getElementById('next-btn');

let currentStream = null;
let cameras = [];
let activeCameraIndex = 0;

function setStatus(msg) {
    statusEl.textContent = msg;
}

function stopStream() {
    if (!currentStream) return;
    currentStream.getTracks().forEach(track => track.stop());
    currentStream = null;
    previewEl.srcObject = null;
}

async function listCameras() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        cameras = devices.filter(d => d.kind === 'videoinput');
        if (activeCameraIndex >= cameras.length) activeCameraIndex = 0;
        const current = cameras[activeCameraIndex];
        cameraNameEl.textContent = current ? (current.label || `Camera ${activeCameraIndex + 1}`) : 'No camera devices found';
        nextBtn.disabled = cameras.length <= 1;
        startBtn.disabled = cameras.length === 0;
    } catch (err) {
        setStatus(`Failed to enumerate cameras: ${err.message || err}`);
    }
}

async function startPreview() {
    try {
        stopStream();

        const selectedId = cameras[activeCameraIndex] ? cameras[activeCameraIndex].deviceId : '';
        const constraints = {
            audio: false,
            video: selectedId
                ? { deviceId: { exact: selectedId }, width: { ideal: 1920 }, height: { ideal: 1080 } }
                : true,
        };

        setStatus('Requesting camera permission...');
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        currentStream = stream;
        previewEl.srcObject = stream;
        await previewEl.play();
        document.body.classList.add('mode-live');
        setStatus('');

        // Re-list so labels populate after permission grant.
        await listCameras();
    } catch (err) {
        setStatus(`Unable to start camera: ${err.message || err}`);
    }
}

startBtn.addEventListener('click', startPreview);
nextBtn.addEventListener('click', () => {
    if (!cameras.length) return;
    activeCameraIndex = (activeCameraIndex + 1) % cameras.length;
    const current = cameras[activeCameraIndex];
    cameraNameEl.textContent = current ? (current.label || `Camera ${activeCameraIndex + 1}`) : 'No camera devices found';
});

if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
    navigator.mediaDevices.addEventListener('devicechange', () => {
        listCameras();
    });
}

window.addEventListener('beforeunload', stopStream);

(async function init() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setStatus('getUserMedia is not available in this runtime.');
        startBtn.disabled = true;
        nextBtn.disabled = true;
        return;
    }

    await listCameras();
    setStatus('Click Start Camera.');
})();
