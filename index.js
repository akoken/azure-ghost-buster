var Promise = require("bluebird"),
  url = require("url"),
  path = require("path"),
  BlobService = require("./azureBlobService.js"),
  BaseStore = require("ghost-storage-base"),
  readFile = require("fs"),
  options = {},
  mimeTypes = {
    ".jpg": "image/jpeg",
    ".jpe": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".svgz": "image/svg+xml",
    ".bmp": "image/bmp",
    ".tiff": "image/tiff"
  };

class AzureGhostStorage extends BaseStore {
  constructor(config = {}) {
    super(config);

    options = config || {};
    options.connectionString =
      process.env.storage_connectionString ||
      process.env.AZURE_STORAGE_CONNECTION_STRING ||
      options.connectionString;
    options.container =
      process.env.storage_container || options.container || "ghost";
    options.cdnUrl = process.env.storage_cdnUrl || options.cdnUrl;
  }

  delete(fileName, targetDir) {
    targetDir = targetDir || this.getTargetDir();
    var blobName = path.join(targetDir, fileName);
    var blobService = new BlobService(options);

    return new Promise((resolve, reject) => {
      return blobService
        .delete(blobName)
        .promise()
        .then(() => resolve(true))
        .catch(() => resolve(false));
    });
  }

  exists(fileName) {
    var blobService = new BlobService(options);
    return blobService.doesBlobExist(fileName);
  }

  save(image, targetDir) {
    targetDir = targetDir || this.getTargetDir();
    var blobService = new BlobService(options);
    var blobName;

    return this.getUniqueFileName(image, targetDir)
      .then(function(filename) {
        blobName = filename;

        var blobOptions = {
          contentSettings: {
            cacheControl: "public, max-age=31536000"
          }
        };

        var ext = path.extname(image.name);
        if (ext) {
          var contentType = mimeTypes[ext];
          if (contentType) {
            blobOptions.contentSettings.contentType = contentType;
          }
        }

        return blobService.createBlockBlobFromLocalFileAsync(
          blobName,
          image.path,
          blobOptions
        );
      })
      .delay(500)
      .then(function() {
        var blobUrl = blobService.getUrl(blobName);
        if (!options.cdnUrl) {
          return blobUrl;
        }

        var parsedUrl = url.parse(blobUrl, true, true);
        return options.cdnUrl + parsedUrl.path;
      });
  }

  serve() {
    return (req, res, next) => {
      next();
    };
  }

  read() {
    //not implemented method because ghost needs it.
  }
}

module.exports = AzureGhostStorage;
