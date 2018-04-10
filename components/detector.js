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
        this.faceDetector = new FaceDetector({ fastMode: true, maxDetectedFaces: 1 }); // Fast Detection
        this.faces = []; // First initialisation to be sure to not have a NPE

        this.isDetectingFaces = false;

        // this.easterEgg = false; Not use
        this.context = undefined;
        this.ratio = 0;
    }

    render(){
        return html`

        <!-- Snippet Code CSS Generation -->
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
        <!-- End Snippet Code Generation -->


        <canvas id="canvas"></canvas>
        <video id="video" autoplay muted></video>
        <img id="mustache">
        <img id="hat">
        `;
    }

    async connectedCallback() {
       render(this.render(), this.shadowRoot);
       // Get elements from Id
       this.canvas = this.shadowRoot.querySelector('#canvas');
       this.video = this.shadowRoot.querySelector('#video');
       this.mustache = this.shadowRoot.querySelector('#mustache');
       this.hat = this.shadowRoot.querySelector('#hat');

       //Affect url to images
       this.hat.src = './assets/hat.png';
       this.mustache.src = './assets/mustache.png';

       // Inner method User Media (different from real user media method !)
       await this.getUserMedia();
    }



    async getUserMedia() {
        // Grab camera stream.
        const constraints = {
            video: {
            facingMode: 'user', // To be sure to use the front camera for smartphones !
            frameRate: 60, // To be sure to have a high rate of images
            }
        };

        this.video.srcObject = await navigator.mediaDevices.getUserMedia(constraints);
        // We starts the video
        await this.video.play();

        // The canvas take the size of the screen
        this.canvas.height = window.innerHeight;
        this.canvas.width = window.innerWidth;
        // HACK: Face Detector doesn't accept canvas whose width is odd.
        if (this.canvas.width % 2 == 1) {
            this.canvas.width += 1;
        }

        this.context = this.canvas.getContext('2d');
        // Ratio use to determine the rendering of video in canvas
        // We take the max ratio and apply it to canvas after
        // Width could be diferent from camera and screen !
        this.ratio = Math.max(this.canvas.width / this.video.videoWidth, this.canvas.height / this.video.videoHeight);

        console.log('Ratio Width', this.canvas.width, this.video.videoWidth, this.canvas.width / this.video.videoWidth);
        console.log('Ratio Height', this.canvas.height, this.video.videoHeight, this.canvas.height / this.video.videoHeight);

        console.log('X Dest', this.canvas.width - this.video.videoWidth * this.ratio);
        this.draw();
    }

    async draw() {
        // To be sure to have the minimum delay between frames
        requestAnimationFrame(this.draw.bind(this));

        // Draw video frame.
        this.context.drawImage(this.video, // Source
            (this.canvas.width - this.video.videoWidth * this.ratio) / 2, // x dest in canvas
            // => use to manage portrait vs landscape
            0, // y dest in canvas
            this.video.videoWidth * this.ratio, // width video in canvas
            this.video.videoHeight * this.ratio); // height video in canvas

        if (!this.isDetectingFaces) {
            // Detect faces.
            this.isDetectingFaces = true;
            this.faceDetector.detect(this.canvas).then((facesArray => {
                this.faces = facesArray;
                this.isDetectingFaces = false;
            }));
        }
        // Draw mustache and hat on previously detected face.
        if (this.faces.length) {
            const face = this.faces[0].boundingBox;
            // we get a clientBoudingRect of face placed in the image !
            /*
                height and width give the height and width in px of the face (in the image)
                left, top, bottom, right give the absolute position of the face (in the image)
            */
            this.context.drawImage(this.hat, // Source Hat
                face.left, // x dest Hat
                // we start from the left position
                face.bottom - face.height * 3 / 4 - this.hat.height * face.width / this.hat.width, // Y dest Hat
                // 3/4 of the face height - height of hat apply to ratio of the face width !
                face.width, // width of hat in canvas
                // We take the face width
                this.hat.height * face.width / this.hat.width // height of hat apply to ratio of the face width
            );
            this.context.drawImage(this.mustache, // Source Mustache
                face.left + face.width / 4, // X dest mustache
                // 1 / 4
                face.top + face.height * 3 / 4, // Y dest mustache
                // 3/4 of the face
                face.width / 2,  // width of mustache in canvas
                // The mustache will take the half of the face width
                this.mustache.height * face.width / 2 / this.mustache.width // height of mustache in canvas
                // The mustache will take the ratio of half the widht of face divide by mustache width to respect proportions
            );
        }
    }


}

customElements.define(DetectorComponent.is, DetectorComponent);
