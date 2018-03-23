import {html, render} from '../node_modules/lit-html/lit-html.js';

export class DetectorComponent extends HTMLElement {

    static get is() {
        return 'detector-faces'
    }

    constructor(){
        super();
        this.attachShadow({ mode: "open" });
        if (!('FaceDetector' in window)) {
            FaceDetector = function() {
              console.log('Fake Face Detector used...');
              return {
                detect: async function() { return [] }
              }
            }
          }
        this.faceDetector = new FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
        this.faces = [];

        this.isDetectingFaces = false;

        this.easterEgg = false;
        this.showFace = false;
        this.context = undefined;
        this.ratio = 0;
    }

    render(){
        return html`
        <style>
            :host {
                margin: 0 auto;
                height: 100%;
                background: rgb(51, 51, 58);
                color: #fff;
                user-select: none;
                overflow: hidden;
            }
            video {
                display: none;
            }
            canvas {
                background: rgb(51, 51, 58);
                width: 100vw;
                height: 100vh;
            }
            pre {
                position: absolute;
                top: 24px;
                left: 24px;
                white-space: pre-line;
                right: 24px;
                text-shadow: 0 0 black;
            }
            #mustache, #hat, #sunglasses {
                display: none;
            }
            .visible {
                transform: translateX(0) !important;
            }
        </style>
        <canvas id="canvas"></canvas>
        <video id="video" autoplay muted></video>
        <img id="mustache">
        <img id="hat">
        <img id="sunglasses">
        `;
    }

    async connectedCallback() {
       render(this.render(), this.shadowRoot);
       this.canvas = this.shadowRoot.querySelector('#canvas');
       this.video = this.shadowRoot.querySelector('#video');
       this.mustache = this.shadowRoot.querySelector('#mustache');
       this.hat = this.shadowRoot.querySelector('#hat');
       this.sunglasses = this.shadowRoot.querySelector('#sunglasses');
       this.sunglasses.src = './assets/sunglasses.png';
       this.hat.src = './assets/hat.png';
       this.mustache.src = './assets/mustache.png';

       await this.getUserMedia();
    }



    async getUserMedia() {
        // Grab camera stream.
        const constraints = {
            video: {
            facingMode: 'user',
            frameRate: 60,
            width:  640,
            height: 480,
            }
        };
        this.video.srcObject = await navigator.mediaDevices.getUserMedia(constraints);
        await this.video.play();

        this.canvas.height = window.innerHeight;
        this.canvas.width = window.innerWidth;
        // HACK: Face Detector doesn't accept canvas whose width is odd.
        if (this.canvas.width % 2 == 1) {
            this.canvas.width += 1;
        }

        setTimeout(_ => { this.faces = []; }, 500);

        this.context = this.canvas.getContext('2d');
        this.ratio = Math.max(this.canvas.width / this.video.videoWidth, this.canvas.height / this.video.videoHeight);

        this.draw();
    }

    async draw() {
        requestAnimationFrame(this.draw.bind(this));

        // Draw video frame.
        this.context.drawImage(this.video, 0, 0, this.video.videoWidth, this.video.videoHeight,
            (this.canvas.width - this.video.videoWidth * this.ratio) / 2, 0,
            this.video.videoWidth * this.ratio, this.video.videoHeight * this.ratio);

        if (!this.isDetectingFaces) {
            // Detect faces.
            //console.count('Detecting faces');
            this.isDetectingFaces = true;
            this.faceDetector.detect(this.canvas).then((facesArray => {
                this.faces = facesArray;
                this.isDetectingFaces = false;
            }));
        }
        // Draw mustache and hat on previously detected face.
        if (this.faces.length) {
            const face = this.faces[0].boundingBox;
            if (this.showFace) {
                this.context.beginPath();
                this.context.rect(face.x, face.y, face.width, face.height);
                this.context.lineWidth = 4;
                this.context.strokeStyle = 'deeppink';
                this.context.stroke();
            }
            if (this.easterEgg) {
                this.context.drawImage(this.sunglasses,
                    face.left,
                    face.top + face.height / 2 - this.sunglasses.height * face.width / this.sunglasses.width / 2,
                    face.width,
                    this.sunglasses.height * face.width / this.sunglasses.width);
            } else {
                this.context.drawImage(this.hat,
                    face.left,
                    face.bottom - face.height * 3 / 4 - this.hat.height * face.width / this.hat.width,
                    face.width,
                    this.hat.height * face.width / this.hat.width);
                this.context.drawImage(this.mustache,
                    face.left + face.width / 4,
                    face.top + face.height * 3 / 4,
                    face.width / 2,
                    this.mustache.height * face.width / 2 / this.mustache.width);
            }
        }
    }


}

customElements.define(DetectorComponent.is, DetectorComponent);
