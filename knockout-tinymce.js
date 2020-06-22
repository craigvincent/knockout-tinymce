(function() {
  (function($, ko) {
    var binding, cache, cacheInstance, configure, writeValueToProperty;
    cache = "";
    cacheInstance = null;
    binding = {
      after: ["attr", "value"],
      defaults: {},
      extensions: {},
      init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
        var $element, ext, options, settings;
        $element = $(element);
        // Get custom configuration object from the 'wysiwygConfig' binding, more settings here... http://www.tinymce.com/wiki.php/Configuration
        options = (allBindings.has("tinymceConfig") ? allBindings.get("tinymceConfig") : null);
        // Get any extensions that have been enabled for this instance.
        ext = (allBindings.has("tinymceExtensions") ? allBindings.get("tinymceExtensions") : []);
        settings = configure(binding["defaults"], ext, options, arguments);
        // Ensure the valueAccessor's value has been applied to the underlying element, before instanciating the tinymce plugin
        $element[$element.is('input, textarea') ? 'text' : 'html'](ko.unwrap(valueAccessor()));
        // Defer TinyMCE instantiation
        setTimeout((function() {
          $element.tinymce(settings);
        }), 0);
        // To prevent a memory leak, ensure that the underlying element's disposal destroys it's associated editor.
        ko.utils["domNodeDisposal"].addDisposeCallback(element, function() {
          var tinymce;
          tinymce = $(element).tinymce();
          if (tinymce) {
            tinymce.remove();
          }
          if (tinymce === cacheInstance) {
            cacheInstance = null;
          }
        });
        return {
          controlsDescendantBindings: true
        };
      },
      update: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
        var tinymce, value;
        tinymce = $(element).tinymce();
        // ko.unwrap makes sure that this works
        // even if the given binding value is not an observable
        value = ko.unwrap(valueAccessor());
        // tiny mce crashes if value is null
        if (value === null) {
          value = "";
        }
        if (tinymce && !(cacheInstance === tinymce && cache === value)) {
          cacheInstance = tinymce;
          cache = value;
          if (tinymce.getContent() !== value) {
            tinymce.setContent(value);
          }
        } else {
          // We need to remember the value that was updated during TinyMCE initialization,
          // otherwise TinyMCE will show up with the old value
          $(element).val(value);
        }
      }
    };
    writeValueToProperty = function(property, allBindings, key, value, checkIfDifferent) {
      var propWriters;
      if (!property || !ko.isObservable(property)) {
        propWriters = allBindings.get('_ko_property_writers');
        if (propWriters && propWriters[key]) {
          return propWriters[key](value);
        }
      } else if (ko.isWriteableObservable(property) && (!checkIfDifferent || property.peek() !== value)) {
        return property(value);
      }
    };
    configure = function(defaults, extensions, options, args) {
      var applyChange, config, setup;
      // Apply global configuration over TinyMCE defaults
      config = $.extend(true, {}, defaults);
      if (options) {
        // Concatenate element specific configuration
        ko.utils.objectForEach(options, function(property) {
          if (Object.prototype.toString.call(options[property]) === "[object Array]") {
            if (!config[property]) {
              config[property] = [];
            }
            options[property] = ko.utils.arrayGetDistinctValues(config[property].concat(options[property]));
          }
        });
        $.extend(true, config, options);
      }
      // Ensure paste functionality
      if (!config["plugins"]) {
        config["plugins"] = ["paste"];
      } else {
        if ($.inArray("paste", config["plugins"]) === -1) {
          config["plugins"].push("paste");
        }
      }
      // Define change handler
      applyChange = function(editor) {
        // Ensure the valueAccessor state to achieve a realtime responsive UI.
        editor.on("change keyup nodechange", function(e) {
          return setTimeout((function() {
            var name, value;
            value = editor.getContent();
            cache = value;
            cacheInstance = editor;
            
            // Update the view model
            writeValueToProperty(args[1](), args[2], "tinymce", value);
// Run all applied extensions
            for (name in extensions) {
              if (extensions.hasOwnProperty(name)) {
                binding["extensions"][extensions[name]](editor, e, args[2], args[4]);
              }
            }
          }), 0);
        });
      };
      if (typeof config["setup"] === "function") {
        setup = config["setup"];
        // Concatenate setup functionality with the change handler
        config["setup"] = function(editor) {
          setup(editor);
          applyChange(editor);
        };
      } else {
        // Apply change handler
        config["setup"] = applyChange;
      }
      return config;
    };
    // Export the binding
    ko.bindingHandlers["tinymce"] = binding;
    ko.expressionRewriting._twoWayBindings["tinymce"] = true;
  })(jQuery, ko);

}).call(this);
