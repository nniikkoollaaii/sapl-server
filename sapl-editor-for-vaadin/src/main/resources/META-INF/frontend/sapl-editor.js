import { LitElement, html } from 'lit-element';
import { CodeMirrorStyles, CodeMirrorLintStyles, CodeMirrorHintStyles, XTextAnnotationsStyles, AutocompleteWidgetStyle, ReadOnlyStyle } from './shared-styles.js';

class SAPLEditor extends LitElement {

  constructor() {
    super();
    this.document = "";
    this.xtextLang = "sapl";
  }

  static get properties() {
    return {
      document: { type: String },
      isReadOnly: { type: Boolean },
      hasLineNumbers: { type: Boolean },
      autoCloseBrackets: { type: Boolean },
      matchBrackets: { type: Boolean },
      textUpdateDelay: { type: Number },
      editor: { type: Object },
      xtextLang: { type: String },
    }
  }

  static get styles() {
    return [
      CodeMirrorStyles,
      CodeMirrorLintStyles,
      CodeMirrorHintStyles,
      XTextAnnotationsStyles,
      AutocompleteWidgetStyle,
      ReadOnlyStyle,
    ]
  }

  set editor(value) {
    let oldVal = this._editor;
    this._editor = value;
    console.debug('SaplEditor: set editor', oldVal, value);
    this.requestUpdate('editor', oldVal);
    this.onEditorChangeCheckOptions(value);
  }

  get editor() {
    return this._editor;
  }

  set isReadOnly(value) {
    let oldVal = this._isReadOnly;
    this._isReadOnly = value;
    console.debug('SaplEditor: set isReadOnly', oldVal, value);
    this.requestUpdate('isReadOnly', oldVal);
    this.setEditorOption('readOnly', value);
  }

  get isReadOnly() { 
    return this._isReadOnly; 
  }

  connectedCallback() {
    super.connectedCallback();

    var self = this;
    var shadowRoot = self.shadowRoot;

    var widget_container = document.createElement("div");
    widget_container.id = "widgetContainer";

    require(["./xtext-codemirror.min",
      "./sapl-mode"], function (xtext, mode) {
        self.editor = xtext.createEditor({
          document: shadowRoot,
          xtextLang: self.xtextLang,
          sendFullText: true,
          syntaxDefinition: mode,
          readOnly: self.isReadOnly,
          lineNumbers: self.hasLineNumbers,
          showCursorWhenSelecting: true,
          enableValidationService: true,
          textUpdateDelay: self.textUpdateDelay,
          gutters: ["CodeMirror-lint-markers"],
          extraKeys: {"Ctrl-Space": "autocomplete"},
          hintOptions: { 
            container: widget_container
          }
        });

        self.editor.doc.setValue(self.document);
        self.editor.doc.on("change", function (doc, changeObj) {
          var value = doc.getValue();
          self.onDocumentChanged(value);
        });

        self.registerValidationCallback(self.editor);

        shadowRoot.appendChild(widget_container);
      });
  }

  registerValidationCallback(editor) {
    var self = this;

    var xTextServices = editor.xtextServices;
    xTextServices.originalValidate = xTextServices.validate;
    xTextServices.validate = function (addParam) {
      var services = this;
      return services.originalValidate(addParam).done(function (result) {
        if(self.$server !== undefined) {
          var issues = result.issues;
          self.$server.onValidation(issues);
        }
        else {
          throw "Connection between editor and server could not be established. (onValidation)";
        }
      });
    }
  }

  onDocumentChanged(value) {
    this.document = value;
    if(this.$server !== undefined) {
      this.$server.onDocumentChanged(value);
    }
    else {
      throw "Connection between editor and server could not be established. (onDocumentChanged)";
    }
  }

  setEditorDocument(element, document) {
    this.document = document;
    if(element.editor !== undefined) {
      element.editor.doc.setValue(document);
    }
  }

  setEditorOption(option, value) {
    let isEditorSet = this.editor !== undefined;
    console.debug('SaplEditor: setEditorOption', option, value, isEditorSet);

    if(this.editor !== undefined) {
      if(option === 'readOnly') {
        if(value === true) {
          this.editor.setOption("theme", 'readOnly');
        } else {
          this.editor.setOption("theme", 'default');
        }
      }
      this.editor.setOption(option, value);  
    }
  }

  onEditorChangeCheckOptions(editor) {
    let isEditorSet = editor !== undefined;
    console.debug('SaplEditor: onEditorChangeCheckOptions', isEditorSet);

    if(isEditorSet) {
      this.setEditorOption('readOnly', this.isReadOnly);
    }
  }

  render() {
    return html`
<div id="xtext-editor" data-editor-xtext-lang="${this.xtextLang}"/>
		      `;
  }
}

customElements.define('sapl-editor', SAPLEditor);