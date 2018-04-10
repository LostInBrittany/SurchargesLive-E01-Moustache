'.source.js':
    'Component':
        'prefix': 'webcomponent'
        'body': """
            import {html, render} from '../node_modules/lit-html/lit-html.js';

            export class $1 extends HTMLElement {
               static get is() {
                   return '$2'
               }

               constructor(){
                   super();
                   this.attachShadow({ mode: 'open' });
               }

               render(){
                   return html`

               `;
               }

               async connectedCallback() {
                   render(this.render(), this.shadowRoot);

               }


            }

            customElements.define($1.is, $1);
        """
