module.exports = function (grunt) {

  "use strict";
  grunt.file.defaultEncoding = 'utf-8';

  var
    pkg = grunt.file.readJSON("package.json"),
    ver = pkg.version,
    name = grunt.option('name') || '',
    dest = grunt.option('dest') || 'dest/',
    pluginspath = grunt.option('pluginspath') || 'plugins/',
    lang = grunt.option('lang') || 'en',
    version = (name !== '') ? (grunt.option('ver') || ver) + "." + name : (grunt.option('ver') || ver),
    distpaths = [
      "dist/projekktor-" + version + ".js",
      "dist/projekktor-" + version + ".min.map",
      "dist/projekktor-" + version + ".min.js"
    ],
    defaults = [
      "+playlist",
      "-youtube",
      "+html",
      "+osmf",
      "+osmfhls",
      "+osmfmss",
      "+msehls",
      "-plugins/logo",
      "-plugins/ima",
      "-plugins/postertitle",
      "-plugins/share",
      "-plugins/tracking"].join(":"),
    filesUglify = {},
    gzip = require("gzip-js"),
    readOptionalJSON = function (filepath) {
      var data = {};
      try {
        data = grunt.file.readJSON(filepath);
      } catch (e) { }
      return data;
    };

  filesUglify["dist/projekktor-" + version + ".min.js"] = ["dist/projekktor-" + version + ".js"];
  dest = dest + name + "/";
  grunt.file.mkdir(dest);
  
  grunt.initConfig({
    pkg: pkg,
    dst: readOptionalJSON("dist/.destination.json"),
    compare_size: {
      files: ["dist/projekktor-" + version + ".js", "dist/projekktor-" + version + ".min.js"],
      options: {
        compress: {
          gz: function (contents) {
            return gzip.zip(contents, {}).length;
          }
        },
        cache: "dist/.sizecache.json"
      }
    },
    polyfiller: {
      build: {
        options: {
          features: ['Promise', 'PointerEvents']
        },
        dest: 'dist/polyfills.js'
      }
    },
    build: {
      all: {
        dest: "dist/projekktor-" + version + ".js",
        src: [
          "dist/polyfills.js",
          "src/controller/projekktor.js",
          "src/controller/projekktor.config.version.js",
          "src/controller/projekktor.config.js",
          "src/controller/projekktor.utils.js",
          "src/controller/projekktor.useragent.js",
          "src/controller/projekktor.features.js",
          "src/controller/projekktor.fullscreenapi.js",
          "src/controller/projekktor.persistentstorage.js",
          "src/controller/projekktor.platforms.js",
          "src/controller/projekktor.plugininterface.js",
          "src/controller/projekktor.messages." + lang + ".js",
          "src/models/player.js",
          "src/models/player.NA.js",
          "src/models/player.audio.video.js",
          "src/models/player.audio.video.hls.js",
          "src/models/player.playlist.js",
          "src/models/player.image.html.js",              
          {flag: "osmf", src: "src/models/player.audio.video.osmf.js"},
          {flag: "osmfhls", src: "src/models/player.audio.video.osmf.hls.js"},
          {flag: "osmfmss", src: "src/models/player.audio.video.osmf.mss.js"},
          {flag: "silverlight", src: "src/models/player.audio.video.silverlight.js"},
          {flag: "msehls", src: "src/models/player.audio.video.mse.hls.js"},
          {flag: "videojs", src: "src/models/player.videojs.js"},
          {flag: "youtube", src: "src/models/player.youtube.js" }, 
          "src/plugins/projekktor.display.js",
          "src/plugins/projekktor.controlbar.js",
          "src/plugins/projekktor.contextmenu.js",
          "src/plugins/projekktor.settings.js"     
        ]
      }
    },
    lineending: {
      dist: {
        options: {
          eol: 'lf',
          overwrite: true
        },
        files: {
          '': ["dist/projekktor-" + version + ".js"]
        }
      }
    },
    platforms: {
        videojs: {

        }
    },
    concat: {
      vpaidvideojs: {
        files: {
          'platforms/videojs/videojs.vpaid.css': ['platforms/videojs/video-js.css', 'platforms/videojs/videojs.vast.vpaid.css', 'platforms/videojs/videojs-projekktor-model-custom.css'],
          'platforms/videojs/videojs.vpaid.js': ['platforms/videojs/video.js', 'platforms/videojs/videojs_5.vast.vpaid.js']
        }
      }
    },
    bump: {
      options: {
        files: ['package.json', 'src/controller/projekktor.config.version.js'],
        updateConfigs: [],
        commit: true,
        commitMessage: 'Bump version to %VERSION%',
        commitFiles: ['package.json',  'src/controller/projekktor.config.version.js'],
        createTag: true,
        tagName: '%VERSION%',
        tagMessage: 'Projekktor %VERSION%',
        push: false,
        pushTo: 'upstream',
        gitDescribeOptions: '--tags --always --abbrev=1 --dirty=-d',
        globalReplace: false,
        prereleaseName: false,
        metadata: '',
        regExp: /([\"\']?version[\"\']?\s*?[:=]\s*?[\'\"])(\d+\.\d+\.\d+(-\.\d+)?(-\d+)?)[\d||A-a|.|-]*(['|"]?)/i
      }
    },
    uglify: {
      all: {
        files: filesUglify,
        options: {
          banner: "/*! Projekktor v<%= pkg.version %>\n" +
          "* <%= grunt.template.today('yyyy-mm-dd') %> \n" +
          "* \n" +
          "* http://www.projekktor.com \n" +
          "* Copyright 2010-2014 Sascha Kluger, Spinning Airwhale Media, http://www.spinningairwhale.com \n" +
          "* Copyright 2014-2017 Radosław Włodkowski, www.wlodkowski.net, radoslaw@wlodkowski.net \n" +
          "* \n" +
          "* under GNU General Public License \n" +
          "* http://www.projekktor.com/license/\n" +
          "*/",
          sourceMap: true,
          sourceMapName: "dist/projekktor-" + version + ".min.map",
          report: "min",
          beautify: false,
          compress: {
            hoist_funs: false,
            join_vars: false,
            loops: false,
            unused: false
          }
        }
      },
      vpaidvideojs: {
        files: {
          'platforms/videojs/videojs.vpaid.min.js': ['platforms/videojs/video.js', 'platforms/videojs/videojs_5.vast.vpaid.js']
        },
        options: {
          sourceMap: false,
          report: "min",
          beautify: false,
          compress: {
            hoist_funs: false,
            join_vars: false,
            loops: false,
            unused: false
          }
        }
      }
    },
    clean: {
        all: [dest, 'dist/*.js', 'dist/*.map', 'dist/.*.json']
    },
    copy: {
      main: {
        files: [
          // includes files within path
          // {expand: true, src: ['path/*'], dest: 'dest/', filter: 'isFile'},
          // includes files within path and its sub-directories
          {expand: true, flatten: true, src: ['dist/*' + version + '*'], dest: dest},
          {expand: true, flatten: true, src: ['dist/media/*'], dest: dest + 'media/'},
          {expand: true, src: ['platforms/**'], dest: dest},       
          {expand: true, src: ['themes/**'], dest: dest},
          {expand: true, src: ['readme.html'], dest: dest},
          {expand: true, flatten: true, src: ['lib/jQuery/3.2.1/**'], dest: dest, filter: 'isFile'}
          // makes all src relative to cwd
          // {expand: true, cwd: 'path/', src: ['**'], dest: 'dest/'},
          // flattens results to a single level
          // {expand: true, flatten: true, src: ['path/**'], dest: 'dest/', filter: 'isFile'}
        ]
      },
      platforms: {
        files: [
          {expand: true, cwd:'lib/hls.js/dist/', src:['*.js', '*.map'], dest: 'platforms/mse/hls.js/'},
          {expand: true, cwd:'lib/video.js/dist/', src:['*.js', '*.map', '*.css'], dest: 'platforms/videojs/'},
          {expand: true, cwd:'lib/videojs-vast-vpaid/bin/', src:['videojs_5*.js', 'videojs_5*.js.map', '*.css.map', '*.css', '*.swf'], dest: 'platforms/videojs/'}
        ]
      }
    },
    compress: {
      main: {
        options: {
          archive: dest + "projekktor-" + version + '.zip'
        },
        files: [
          {expand: true, cwd: dest, src: ['**'], dest: ''}, // makes all src relative to cwd
        ]
      }
    }    
  });

  // Special concat/build task to handle various build requirements
  grunt.registerMultiTask(
    "build",
    "Concatenate source (include/exclude modules with +/- flags), embed date/version",

  function () {
    // Concat specified files.
    var compiled = "",
      modules = this.flags,
      optIn = !modules["*"],
      explicit = optIn || Object.keys(modules).length > 1,
      name = this.data.dest,
      src = this.data.src,
      deps = {},
      excluded = {},
      version = grunt.config("pkg.version"),
      excluder = function (flag, needsFlag) {
        // optIn defaults implicit behavior to weak exclusion
        if (optIn && !modules[flag] && !modules["+" + flag]) {
          excluded[flag] = false;
        }

        // explicit or inherited strong exclusion
        if (excluded[needsFlag] || modules["-" + flag]) {
          excluded[flag] = true;

          // explicit inclusion overrides weak exclusion
        } else if (excluded[needsFlag] === false && (modules[flag] || modules["+" + flag])) {

          delete excluded[needsFlag];

          // ...all the way down
          if (deps[needsFlag]) {
            deps[needsFlag].forEach(function (subDep) {
              modules[needsFlag] = true;
              excluder(needsFlag, subDep);
            });
          }
        }
      };

    // figure out which files to exclude based on these rules in this order:
    //  dependency explicit exclude
    //  > explicit exclude
    //  > explicit include
    //  > dependency implicit exclude
    //  > implicit exclude
    // examples:
    //  *                  none (implicit exclude)
    //  *:*                all (implicit include)
    //  *:*:-html           all except css and dependents (explicit > implicit)
    //  *:*:-html:+youtube  same (excludes effects because explicit include is trumped by explicit exclude of dependency)
    //  *:+youtube         none except effects and its dependencies (explicit include trumps implicit exclude of dependency)
    src.forEach(function (filepath, index) {
      
      if (filepath.ver===true) {
        var versionpath =  pluginspath + "/" + filepath.src;
        var dirs = grunt.file.expand({filter: 'isDirectory'}, [versionpath + "/*"]);
        dirs.sort(
          function versionSort($a, $b) {
                  return -1 * version_compare($a, $b);
          }           
        )
      filepath.src = dirs[0] + "/projekktor." + filepath.src + ".js";
      }
      // check for user plugins
      var user = filepath.user;
      if (user && filepath.src) {
        if (!grunt.file.exists(filepath.src)) {
          delete src[index];
          return;
        }
      }

      var flag = filepath.flag;
 
      if (flag) {
        excluder(flag);

        // check for dependencies
        if (filepath.needs) {
          deps[flag] = filepath.needs;
          filepath.needs.forEach(function (needsFlag) {
            excluder(flag, needsFlag);
          });
        }
      }
    });

    // append excluded modules to version
    if (Object.keys(excluded).length) {
      version += " -" + Object.keys(excluded).join(",-");
      // set pkg.version to version with excludes, so minified file picks it up
      grunt.config.set("pkg.version", version);
    }

    // conditionally concatenate source
    src.forEach(function (filepath) {
     
      var flag = filepath.flag,
        specified = false,
        omit = false,
        messages = [];

      if (flag) {
        if (excluded[flag] !== undefined) {
          messages.push([
              ("Excluding " + flag).red,
              ("(" + filepath.src + ")").grey
            ]);
          specified = true;
          omit = !filepath.alt;
          if (!omit) {
            flag += " alternate";
            filepath.src = filepath.alt;
          }
        }
        if (excluded[flag] === undefined) {
          messages.push([
              ("Including " + flag).green,
              ("(" + filepath.src + ")").grey
            ]);

          // If this module was actually specified by the
          // builder, then set the flag to include it in the
          // output list
          if (modules["+" + flag]) {
            specified = true;
          }
        }

        filepath = filepath.src;

        // Only display the inclusion/exclusion list when handling
        // an explicit list.
        //
        // Additionally, only display modules that have been specified
        // by the user
        if (explicit && specified) {
          messages.forEach(function (message) {
            grunt.log.writetableln([27, 30], message);
          });
        }
      }

      if (!omit) {
        compiled += grunt.file.read(filepath);
      }
    });

    // Embed Version
    // Embed Date
    compiled = compiled.replace(/@VERSION/g, version)
    // yyyy-mm-ddThh:mmZ
    .replace(/@DATE/g, (new Date()).toISOString().replace(/:\d+\.\d+Z$/, "Z"));

    // Write concatenated source to file
    grunt.file.write(name, compiled);

    // Fail task if errors were logged.
    if (this.errorCount) {
      return false;
    }

    // Otherwise, print a success message.
    grunt.log.writeln("File '" + name + "' created.");
  });

  // Process files for distribution
  grunt.registerTask("dist", function () {
    var stored, flags, paths, fs, nonascii;

    // Check for stored destination paths
    // ( set in dist/.destination.json )
    stored = Object.keys(grunt.config("dst"));

    // Allow command line input as well
    flags = Object.keys(this.flags);

    // Combine all output target paths
    paths = [].concat(stored, flags).filter(function (path) {
      return path !== "*";
    });

    // Ensure the dist files are pure ASCII
    fs = require("fs");
    nonascii = false;

    distpaths.forEach(function (filename) {
      var i,
      text = fs.readFileSync(filename, "utf8"); 

      // Ensure files use only \n for line endings, not \r\n
      if (/\x0d\x0a/.test(text)) {
        var index = /\x0d\x0a/.exec(text).index;
        var subText = text.substring(0, index);
        var lines = subText.split(/\n/);
        grunt.log.writeln(filename + ": [" + lines.length + "] Incorrect line endings (\\r\\n)");
        nonascii = true;
      }

      // Ensure only ASCII chars so script tags don't need a charset attribute
      /*if (text.length !== Buffer.byteLength(text, "utf8")) {
        grunt.log.writeln(filename + ": Non-ASCII characters detected:");
        for (i = 0; i < text.length; i++) {
          c = text.charCodeAt(i);
          if (c > 127) {
            grunt.log.writeln("- position " + i + ": " + c);
            grunt.log.writeln("-- " + text.substring(i - 20, i + 20));
            break;
          }
        }
        nonascii = true;
      }*/

      // Modify map/min so that it points to files in the same folder;
      // see https://github.com/mishoo/UglifyJS2/issues/47
      if (/\.map$/.test(filename)) {
        text = text.replace(/"dist\//g, "\"");
        fs.writeFileSync(filename, text, "utf-8");

        // Use our hard-coded sourceMap directive instead of the autogenerated one (#13274; #13776)
      } else if (/\.min\.js$/.test(filename)) {
        i = 0;
        text = text.replace(/(?:\/\*|)\n?\/\/@\s*sourceMappingURL=.*(\n\*\/|)/g,

        function (match) {
          if (i++) {
            return "";
          }
          return match;
        });
        fs.writeFileSync(filename, text, "utf-8");
      }

      // Optionally copy dist files to other locations
      paths.forEach(function (path) {
        var created;

        if (!/\/$/.test(path)) {
          path += "/";
        }

        created = path + filename.replace("dist/", "");
        grunt.file.write(created, text);
        grunt.log.writeln("File '" + created + "' created.");
      });
    });

    return !nonascii;
  });

  // Load grunt tasks from NPM packages  
  grunt.loadNpmTasks("grunt-bump");
  grunt.loadNpmTasks("grunt-contrib-clean");
  grunt.loadNpmTasks("grunt-contrib-copy");
  grunt.loadNpmTasks("grunt-contrib-compress");
  grunt.loadNpmTasks("grunt-compare-size");
  grunt.loadNpmTasks("grunt-contrib-uglify");
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-polyfiller');
  grunt.loadNpmTasks('grunt-lineending');

  // Default build that mirrors the Projekktor distribution
  grunt.registerTask("default", [
    "clean",
    "polyfiller",
    "build:*:*:" + defaults,
    "lineending",
    "uglify:all",
    "dist:*",
    "compare_size",
    "copy:main",
    "compress"
  ]);

  grunt.registerMultiTask("platforms", "prepare platforms for distribution", function(){
       grunt.task.run("copy:platforms");
       grunt.task.run("concat:vpaidvideojs");
       grunt.task.run("uglify:vpaidvideojs");
  });
};
