const https = require('https');
const fs = require('fs');
const FormData = require('form-data');
const path = require('path');

// Cloudflare 配置
const ACCOUNT_ID = 'd398e20a09cd5e12b049822ee3c263a5';
const API_TOKEN = 'Plt5KPZQj9xhrY61dO6ncMnTlif9HpJ4aedKjWOA';
const ACCOUNT_HASH = 'H1BBNTYAdMQC-Xnc380GWA';

/**
 * 上传图片到 Cloudflare Images
 * @param {string} imagePath - 本地图片路径
 * @param {string} customId - 自定义图片 ID（可选）
 * @returns {Promise<object>} - 上传结果
 */
async function uploadImage(imagePath, customId = null) {
  return new Promise((resolve, reject) => {
    // 检查文件是否存在
    if (!fs.existsSync(imagePath)) {
      return reject(new Error(`文件不存在: ${imagePath}`));
    }

    // 创建 form-data
    const form = new FormData();
    form.append('file', fs.createReadStream(imagePath));

    // 如果提供了自定义 ID，则添加到表单
    if (customId) {
      form.append('id', customId);
    }

    // 构建请求选项
    const options = {
      method: 'POST',
      hostname: 'api.cloudflare.com',
      path: `/client/v4/accounts/${ACCOUNT_ID}/images/v1`,
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        ...form.getHeaders()
      }
    };

    console.log(`正在上传图片: ${imagePath}`);
    if (customId) {
      console.log(`使用自定义 ID: ${customId}`);
    }

    // 发送请求
    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);

          if (response.success) {
            console.log('\n✅ 上传成功！');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('图片 ID:', response.result.id);
            console.log('文件名:', response.result.filename);
            console.log('上传时间:', response.result.uploaded);
            console.log('\n📸 访问链接:');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

            // 构建自定义访问链接
            const imageId = response.result.id;
            const publicUrl = `https://imagedelivery.net/${ACCOUNT_HASH}/${imageId}/public`;

            console.log('🔗 公开访问链接:');
            console.log(publicUrl);

            // 打印所有可用的访问链接
            const variants = response.result.variants;
            console.log('\n📦 所有变体链接:');
            variants.forEach((url, index) => {
              console.log(`变体 ${index + 1}: ${url}`);
            });

            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

            resolve(response.result);
          } else {
            console.error('❌ 上传失败:', response.errors);
            reject(new Error(JSON.stringify(response.errors)));
          }
        } catch (error) {
          reject(new Error(`解析响应失败: ${error.message}\n原始响应: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ 请求失败:', error.message);
      reject(error);
    });

    // 发送表单数据
    form.pipe(req);
  });
}

// 主函数
async function main() {
  try {
    // 上传图片
    const imagePath = path.join(__dirname, 'img/1.png');
    const customId = 'my-image-1'; // 你可以自定义 ID，或者设为 null 让系统自动生成

    const result = await uploadImage(imagePath, customId);

    // 返回结果供其他程序使用
    return result;
  } catch (error) {
    console.error('错误:', error.message);
    process.exit(1);
  }
}

// 如果直接运行此文件，则执行 main 函数
if (require.main === module) {
  main();
}

// 导出函数供其他模块使用
module.exports = { uploadImage };
