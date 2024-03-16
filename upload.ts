import multer from "multer";
import fs from "fs";

// Check if Necessary folder is exist;
if (!fs.existsSync("./uploads")) {
  fs.mkdir("./uploads", (err) => {
    if (err) console.log(err);
  });
}

// Storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

// Create the multer instance
const upload = multer({ storage: storage });
export default upload;
