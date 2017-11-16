var FS = require('fs')
var Path = require('path')
var mkdirp = require('mkdirp')
var compileToHTML = require('./lib/compile-to-html')

function SimpleHtmlPrecompiler (staticDir, paths, options) {
  this.staticDir = staticDir
  this.paths = paths
  this.options = options || {}
  this.numConcurent = 10
}

SimpleHtmlPrecompiler.prototype.apply = function (compiler) {
  var self = this
  compiler.plugin('after-emit', function (compilation, done) {

    function paginated(offset) {
      Promise.all(
        self.paths.slice(offset, offset + self.numConcurent).map(function (outputPath) {
          return new Promise(function (resolve, reject) {
            console.log("Obtaining", new Date(), outputPath)
            compileToHTML(self.staticDir, outputPath, self.options, function (prerenderedHTML) {
              if (self.options.postProcessHtml) {
                prerenderedHTML = self.options.postProcessHtml({
                  html: prerenderedHTML,
                  route: outputPath
                })
              }
              var folder = Path.join(self.options.outputDir || self.staticDir, outputPath)
              mkdirp(folder, function (error) {
                if (error) {
                  return reject('Folder could not be created: ' + folder + '\n' + error)
                }
                var file = Path.join(folder, 'index.html')
                FS.writeFile(
                  file,
                  prerenderedHTML,
                  function (error) {
                    if (error) {
                      return reject('Could not write file: ' + file + '\n' + error)
                    }
                    console.log("---- Obtained", new Date(), outputPath)
                    resolve()
                  }
                )
              })
            })
          })
        })
      )
      .then(function () {
        if (offset + self.numConcurent >= self.paths.length)
          done()
        else
        paginated(offset + self.numConcurent)
      })
      .catch(function (error) {
        // setTimeout prevents the Promise from swallowing the throw
        setTimeout(function () { throw error })
      })
    }

    paginated(0)
  })
}

module.exports = SimpleHtmlPrecompiler
