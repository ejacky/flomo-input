'use strict';

/**
 * 同步内容到微博
 * @param {string} content - 要发布的内容
 * @param {string} cookie - 微博 Cookie
 * @returns {Promise<void>}
 */
export async function syncToWeibo(content, cookie) {
    // 微博发布接口
    // 注意：这个接口可能需要根据实际情况调整
    const url = 'https://weibo.com/aj/mblog/add?ajwvr=6';

    // 构建请求数据
    const formData = new URLSearchParams();
    formData.append('text', content);
    formData.append('pic_id', ''); // 图片 ID，文本发布为空
    formData.append('is_ori', '1'); // 是否原创
    formData.append('location', 'page_100505_home'); // 位置信息

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'Cookie': cookie,
                'Referer': 'https://weibo.com/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: formData.toString()
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`微博同步失败: ${response.status} - ${errorText}`);
        }

        const result = await response.json();

        // 检查微博返回的结果
        if (result.code === '100000' || result.code === 'A00006') {
            return; // 成功
        } else {
            throw new Error(result.msg || result.message || '微博同步失败');
        }
    } catch (error) {
        // 如果是网络错误，重新抛出
        if (error.message.includes('微博同步失败')) {
            throw error;
        }
        throw new Error(`微博同步失败: ${error.message}`);
    }
}
