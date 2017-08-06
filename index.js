var Promise = require("bluebird"),
  url = require("url"),
  path = require("path"),
  BlobService = require("./azureStorageService.js"),
  BaseStore = require("ghost-storage-base"),
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
    return new Promise((resolve, reject) => {
      return blobService
        .doesBlobExist(fileName)
        .promise()
        .then(() => resolve(true))
        .catch(() => resolve(false));
    });
  }

  save(image, targetDir) {
    targetDir = targetDir || this.getTargetDir();
    var blobService = new BlobService(options);
    var blobName;

    return new Promise((resolve, reject) => {
      Promise.all([this.getUniqueFileName(image, targetDir)])
        .then(function(fileName, file) {
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

          blobService
            .createBlockBlobFromLocalFileAsync(
              blobName,
              image.path,
              blobOptions
            )
            .promise()
            .then(function() {
              var blobUrl = blobService.getUrl(blobName);

              if (!options.cdnUrl) {
                resolve(blobUrl);
              }

              var parsedUrl = url.parse(blobUrl, true, true);
              resolve(options.cdnUrl + parsedUrl.path);
            });
        })
        .catch(error => reject(error));
    });
  }

  serve() {
    return (req, res, next) => {
      next();
    };
  }

  read() {
    /*
     * Dummy function as ghost needs it
     */
  }
}

module.exports = AzureGhostStorage;
