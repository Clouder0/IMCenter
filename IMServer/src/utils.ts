import COS from "cos-nodejs-sdk-v5";
import { randomUUID } from "crypto";
import dotenv from "dotenv";

dotenv.config();

let cos_available = true;

if (
  !process.env.SECRET_ID ||
  !process.env.SECRET_KEY ||
  !process.env.BUCKET ||
  !process.env.REGION
) {
  console.log(
    "Missing image uploading environment variables. Image processing will be disabled.",
  );
  cos_available = false;
}

const cos = new COS({
  SecretId: process.env.SECRET_ID as string,
  SecretKey: process.env.SECRET_KEY as string,
  KeepAlive: false,
});

export const defaultCOSBucketParams = {
  Bucket: process.env.BUCKET as string,
  Region: process.env.REGION as string,
};

export { cos };

export const uploadLocalFile = async (path: string) => {
  if (!cos_available) return "";
  const id = randomUUID();
  await cos.uploadFile({
    ...defaultCOSBucketParams,
    Key: `imc_imgs/${id}`,
    FilePath: path,
  });
};
