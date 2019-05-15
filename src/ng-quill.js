/* globals define, angular */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(['quill'], factory)
  } else if (typeof module !== 'undefined' && typeof exports === 'object') {
    module.exports = factory(require('quill'))
  } else {
    root.Requester = factory(root.Quill)
  }
}(this, function (Quill) {
  'use strict'

  var app
  // declare ngQuill module
  app = angular.module('ngQuill', [])

  app.provider('ngQuillConfig', function () {
    var config = {
      modules: {
        toolbar: [
          ['bold', 'italic', 'underline', 'strike'],        // toggled buttons
          ['blockquote', 'code-block'],

          [{ 'header': 1 }, { 'header': 2 }],               // custom button values
          [{ 'list': 'ordered' }, { 'list': 'bullet' }],
          [{ 'script': 'sub' }, { 'script': 'super' }],      // superscript/subscript
          [{ 'indent': '-1' }, { 'indent': '+1' }],          // outdent/indent
          [{ 'direction': 'rtl' }],                         // text direction

          [{ 'size': ['small', false, 'large', 'huge'] }],  // custom dropdown
          [{ 'header': [1, 2, 3, 4, 5, 6, false] }],

          [{ 'color': [] }, { 'background': [] }],          // dropdown with defaults from theme
          [{ 'font': [] }],
          [{ 'align': [] }],

          ['clean'],                                         // remove formatting button

          ['link', 'image', 'video']                         // link and image, video
        ]
      },
      theme: 'snow',
      placeholder: 'Insert text here ...',
      readOnly: false,
      bounds: document.body
    }

    this.set = function (customConf) {
      customConf = customConf || {}

      if (customConf.modules) {
        config.modules = customConf.modules
      }
      if (customConf.theme) {
        config.theme = customConf.theme
      }
      if (customConf.placeholder !== null && customConf.placeholder !== undefined) {
        config.placeholder = customConf.placeholder.trim()
      }
      if (customConf.bounds) {
        config.bounds = customConf.bounds
      }
      if (customConf.readOnly) {
        config.readOnly = customConf.readOnly
      }
      if (customConf.formats) {
        config.formats = customConf.formats
      }
    }

    this.$get = function () {
      return config
    }
  })

  app.component('ngQuillEditor', {
    bindings: {
      'modules': '<modules',
      'theme': '@?',
      'readOnly': '<?',
      'formats': '<?',
      'placeholder': '@?',
      'bounds': '<?',
      'scrollingContainer': '<?',
      'scrict': '<?',
      'onEditorCreated': '&?',
      'onContentChanged': '&?',
      'onSelectionChanged': '&?',
      'ngModel': '<',
      'maxLength': '<',
      'minLength': '<',
      'translation': '<',
      'customOptions': '<?',
      'initContent': '<',
      'charsCount': '<',
      'ngRequired':'<',
      'resetQuil':'<'
    },
    require: {
      ngModelCtrl: 'ngModel'
    },
    transclude: {
      'toolbar': '?ngQuillToolbar'
    },
    template: '<div class="ng-hide" ng-show="$ctrl.ready"><ng-transclude ng-transclude-slot="toolbar"></ng-transclude></div>',
    controller: ['$scope', '$element', '$timeout', '$transclude', 'ngQuillConfig', function ($scope, $element, $timeout, $transclude, ngQuillConfig) {
      var config = {}
      var content
      var editorElem
      var modelChanged = false
      var editorChanged = false
      var editor
      var placeholder = ngQuillConfig.placeholder
      this.innerTextLength = '';
      this.remainingChars = '';
      this.setRemainingChars = function (text) {

        /*set remaining Chars by cropping Quill newline chars*/
        this.innerTextLength = editor.getText().replace(/\r|\n/g, '').length;
        // update the remainingchars
        if(this.maxLength ){
          this.remainingChars = this.maxLength - this.innerTextLength;
          if(this.remainingChars < 0) {
            this.remainingChars = 0;
          }
        }


      }

      this.setCharsCount= function (text) {

        /*set remaining Chars by cropping Quill newline chars*/
        this.innerTextLength = editor.getText().replace(/\r|\n/g, '').length;
      }

      this.$onChanges = function (changes) {
        if (changes.ngModel && changes.ngModel.currentValue !== changes.ngModel.previousValue) {
          content = changes.ngModel.currentValue
          if (editor && !editorChanged ) {

            modelChanged = true
            if (content) {
              editor.setContents(editor.clipboard.convert(content))
            } else {
              editor.setText('')
              modelChanged = false;
            }
          }
          editorChanged = false
        }

        if (editor && changes.readOnly) {
          editor.enable(!changes.readOnly.currentValue)
        }
      }

      this.$onInit = function () {

        if (this.placeholder !== null && this.placeholder !== undefined) {
          placeholder = this.placeholder.trim()
        }
        config = {
          theme: this.theme || ngQuillConfig.theme,
          readOnly: this.readOnly || ngQuillConfig.readOnly,
          modules: this.modules || ngQuillConfig.modules,
          formats: this.formats || ngQuillConfig.formats,
          placeholder: placeholder,
          bounds: this.bounds || ngQuillConfig.bounds,
          strict: this.strict,
          scrollingContainer: this.scrollingContainer
        }
      }

      this.$postLink = function () {



        // create quill instance after dom is rendered
        $timeout(function () {
          this._initEditor(editorElem)
        }.bind(this), 0)
      }

      this._initEditor = function (editorElem) {


        var $editorElem = angular.element('<div></div>')
        var container = $element.children()

        editorElem = $editorElem[0]

        // set toolbar to custom one
        if ($transclude.isSlotFilled('toolbar')) {
          config.modules.toolbar = container.find('ng-quill-toolbar').children()[0]
        }

        container.append($editorElem)

        if (this.customOptions) {
          this.customOptions.forEach(function (customOption) {
            var newCustomOption = Quill.import(customOption.import)
            newCustomOption.whitelist = customOption.whitelist
            Quill.register(newCustomOption, true)
          })
        }

        editor = new Quill(editorElem, config);

        // Strip HTML tags and attributes except those which ng-quill uses currently (Attention: Our own settings!).
        // So that any legacy data in ng-quill content or copy&pasted things or whatever won't cause any trouble.
        // This is, however, not a security action! Any attacker could bypass this!
        if(sanitizeHtml) {
          var modelValueBefore = "" + this.ngModelCtrl.$modelValue;
          var modelValueAfter = "" + sanitizeHtml(modelValueBefore,{
                allowedTags: ['a',
                  'b',
                  'br',
                  'em',
                  'i',
                  'li',
                  'ol',
                  'p',
                  'strong',
                  'u',
                  'ul' ],
                allowedAttributes: {
                  '*': [ 'href', 'class','target']
                },
                allowedSchemes: ['http', 'https', 'ftp', 'mailto']
              });
          if(modelValueAfter !== modelValueBefore) {
            content = null;
            editorElem.children[0].innerHTML = modelValueAfter
          }
        }

        this.setRemainingChars();


        if(this.maxLength){
          /* append character count element after the editor and initialize it with char count*/
          angular.element(editorElem).after('<div class="ql-InnerCharCount">' + this.remainingChars + ' ' + this.translation +'</div>')
        }

        if(this.charsCount){
          this.setCharsCount();
          /* append character count element after the editor and initialize it with char count*/
          angular.element(editorElem).after('<div class="ql-InnerCharCount">' + this.innerTextLength + ' ' + this.translation +'</div>')

        }
        this.ready = true
        // mark model as touched if editor lost focus
        var selectionChangeEvent = editor.on('selection-change', function (range, oldRange, source) {

          if(this.resetQuil) editor.setText('') // reset the content of the editor after reseting the form

          //add class 'focused' on ql-container when editor gets focused
          if (editor.hasFocus()) {
            angular.element(editorElem).addClass('focused')
            angular.element(editorElem).prev().addClass('focused')
            this.ngModelCtrl.$setDirty(); //make form dirty when editor is touched
            this.ngModelCtrl.$setTouched();
          } else {
            angular.element(editorElem).removeClass('focused')
            angular.element(editorElem).prev().removeClass('focused')
          }

          if (this.onSelectionChanged) {
            this.onSelectionChanged({
              editor: editor,
              oldRange: oldRange,
              range: range,
              source: source
            })
          }

          if (range) {
            return
          }
          $scope.$applyAsync(function () {
            this.ngModelCtrl.$setTouched()
          }.bind(this))
        }.bind(this))

        // update model if text changes
        var textChangeEvent = editor.on('text-change', function (delta, oldDelta, source) {
          var html = editorElem.children[0].innerHTML
          var text = editor.getText()
          this.setRemainingChars();
          if(this.maxLength){
            /* update remaining chars everytime text is changed*/
            angular.element(editorElem).next().html( this.remainingChars + ' ' + this.translation);
          }
          if(this.charsCount){
            this.setCharsCount();
            /* append character count element after the editor and initialize it with char count*/
            angular.element(editorElem).next().html( this.innerTextLength + ' ' + this.translation);
          }
          if (html === '<p><br></p>') {
            html = null
          }

          // TODO we need another check condition for cases modelChanged or editorChanged to execute the deletion function !
          if (!modelChanged ) {
            $scope.$applyAsync(function () {
              editorChanged = true
              this.ngModelCtrl.$setViewValue(html)

              if (this.onContentChanged) {
                this.onContentChanged({
                  editor: editor,
                  html: html,
                  text: text,
                  delta: delta,
                  oldDelta: oldDelta,
                  source: source
                })
                /*clip longer text than max length account (with break-line character normalizer)*/
                if (this.maxLength && editor.getText().replace(/\r|\n/g, '').length > this.maxLength) {
                  /*editor always counts break lines as characters. Thus maxLength should be dynamic and grow as break lines as added.
                   * This is why we have to take break line characters into consideration, when we pass an index number inside the
                   * deleteText method*/
                  var maxLengthWithBreakLines = this.maxLength + (editor.getLength() - editor.getText().replace(/\r|\n/g, '').length) - 1;
                  editor.deleteText(maxLengthWithBreakLines, editor.getText().replace(/\r|\n/g, '').length);

                }

              }
            }.bind(this))
          }

          modelChanged = false
        }.bind(this))

        $scope.$on('$destroy', function() {
          textChangeEvent.removeListener('text-change');
          selectionChangeEvent.removeListener('selection-change');
        });

        //initialize content in case of undefined (after last changes not more needed (remove after code is tested))
        /*this part causes initially the form to be dirty.
         The solution was to set the from initially to pristine inside the from Ctrl where ng-quill directive is used*/
        /*if (typeof content === 'undefined' && typeof this.initContent === 'undefined' ) { // added extra condition so we can ignore this condition whenever we want by setting the initContent true in the nq quil directive
         var Delta = Quill.import('delta')
         editor.setContents(new Delta ([{ insert: ' '}]))
         }*/

        // set initial content
        if (content) {
          modelChanged = true
          var contents = editor.clipboard.convert(content)
          editor.setContents(contents)
          editor.history.clear()
        }

        // provide event to get informed when editor is created -> pass editor object.
        if (this.onEditorCreated) {
          this.onEditorCreated({editor: editor})

        }

      }
    }]
  })

  return app.name
}))
