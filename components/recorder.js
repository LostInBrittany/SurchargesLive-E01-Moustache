import {html, render} from '../node_modules/lit-html/lit-html.js';

export class RecorderComponent extends HTMLElement {

    static get is() {
        return 'recorder-faces'
    }

    constructor(){
        super();
        this.attachShadow({ mode: "open" });
        this.chunks = [];
        this.recorder;
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
        }
        .bottomBar, #recorder {
            position: absolute;
            bottom: 0;
            right: 0;
            left: 0;
            height: 128px;
            background-color: rgba(51, 51, 58, 0.3);
        }
        .recording .bottomBar {
            opacity: 0;
        }
        #recordButton {
            will-change: transform, background;
            transition: transform .1s ease-out;
            position: absolute;
            bottom: 24px;
            right: 0;
            text-align: center;
            left: 0;
            width: 10px;
            margin: auto;
            background: rgb(0, 193, 233);
            line-height: 64px;
            border-radius: 50%;
            box-shadow: 0 0 2px 0 rgb(51, 51, 58);
            height: 10px;
            border: 36px solid rgb(7, 104, 125);
        }
        #recordButton.recording  {
            background: red;
            border-color: red;
        }
        #preview {
            transform: translateX(120px);
            will-change: transform;
            transition: .1s transform ease-in;
            position:absolute;
            top:0;
            left:0;
            width:100%;
        }
        #previewVideo {
            width: 92px;
            position: absolute;
            bottom: 72px;
            right: 24px;
            background: black;
            display: block;
            border: 2px solid #F44336;
            border-bottom: 0;
        }
        #shareButton {
            position: absolute;
            bottom: 70px;
            right: 24px;
            text-align: center;
            width: 96px;
            background: #F44336;
            line-height: 48px;
            font-family: Roboto;
            font-weight: bold;
            cursor: default;
            will-change: transform;
            transition: .1s transform ease-in;
        }
        #shareButton[data-url] {
            transform: translateY(46px);
        }
        .visible {
            transform: translateX(0) !important;
        }
        #switchCameraButton {
            position: absolute;
            bottom: 36px;
            text-align: center;
            left: 24px;
            width: 48px;
            background: rgb(252, 194, 27);
            line-height: 48px;
            border-radius: 50%;
            box-shadow: 0 0 2px 0 rgb(51, 51, 58);
            height: 48px;
            font-size: 24px;
            cursor: default;
        }
        </style>
        <div class="bottomBar"></div>
        <div id="recordButton"></div>
        <div id="switchCameraButton">&#x1f60e;</div>
        <div id="preview">
            <div id="shareButton">SHARE</div>
            <video id="previewVideo" autoplay muted loop></video>
        </div>
        <pre id="log"></pre>
        `;
    }

    async connectedCallback() {
        render(this.render(), this.shadowRoot);
        this.recordButton = this.shadowRoot.querySelector('#recordButton');
        this.switchCameraButton = this.shadowRoot.querySelector('#switchCameraButton');
        this.preview = this.shadowRoot.querySelector('#preview');
        this.shareButton = this.shadowRoot.querySelector('#shareButton');
        this.previewVideo = this.shadowRoot.querySelector('#previewVideo');
        this.log = this.shadowRoot.querySelector('#log');

        this.recordButton.addEventListener('click', this.toggleRecording.bind(this));

        this.shareButton.addEventListener('click', event => {
            const videoUrl = event.target.dataset.url;

            if ('share' in navigator) {
              navigator.share({
                title: 'Mustache',
                text: 'Check out my new style!',
                url: videoUrl
              })
              .catch(error => {
                // HACK!
                if (error.message == 'WebShare is disabled.') {
                  window.open(videoUrl, '_blank');
                }
              });
            } else {
              window.open(videoUrl, '_blank');
            }
          });

        this.previewVideo.addEventListener('click', event => {
            this.preview.classList.remove('visible');
            this.shareButton.removeAttribute('data-url');
        });

     }

      startRecording() {
        console.time('recording');
        this.preview.classList.remove('visible');
        this.shareButton.removeAttribute('data-url');

        const stream = this.canvas.captureStream();
        //recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=h264', bitsPerSecond: 5000000 });
        this.recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=h264' });
        this.recorder.start(10); // collect 10ms of data
        this.recorder.addEventListener('dataavailable', event => { this.chunks.push(event.data);console.log(event.data) });
        this.recorder.addEventListener('error', event => { this.log.textContent = event.target.error });
        this.recorder.addEventListener('stop', async event => {
          const blob = new Blob(this.chunks, { type: 'video/webm' });

          this.previewVideo.src = URL.createObjectURL(blob);
          await this.previewVideo.play();
          URL.revokeObjectURL(this.previewVideo.src);

          if (this.previewVideo.duration > 1) {
            this.preview.classList.add('visible');
            this.uploadVideo(blob);
          }
          this.chunks = [];
        });
      }

      async stopRecording() {
        if (!this.recorder || this.recorder.state == 'inactive') {
          return;
        }


        console.timeEnd('recording');
        this.recorder.stop();

        // HACK to be able to play preview video later!
        this.previewVideo.play();

      }

      toggleRecording() {
        const isRecording = this.recordButton.classList.toggle('recording');

        if (isRecording) {
            this.startRecording();
        } else {
            this.stopRecording();
        }
      }

      async uploadVideo(blob) {
        const url = new URL('https://www.googleapis.com/upload/storage/v1/b/pwa-mustache/o');
        url.searchParams.append('uploadType', 'media');
        url.searchParams.append('name', new Date().toISOString() + '.webm');

        // Upload video to Google Cloud Storage.
        const response = await fetch(url, {
          method: 'POST',
          body: blob,
          headers: new Headers({
            'Content-Type': 'video/webm',
            'Content-Length': blob.length
          })
        });
        const data = await response.json();
        this.shareButton.dataset.url = `https://storage.googleapis.com/${data.bucket}/${data.name}`;
      }
}

customElements.define(RecorderComponent.is, RecorderComponent);
