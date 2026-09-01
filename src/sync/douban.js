'use strict';

/**
 * 同步内容到豆瓣广播
 * @param {string} content - 要发布的内容
 * @param {string} cookie - 豆瓣 Cookie
 * @returns {Promise<void>}
 */
export async function syncToDouban(content, cookie) {
    // 豆瓣广播发布接口
    // 注意：这个接口可能需要根据实际情况调整
    const url = 'https://www.douban.com/j/status/update';

    // 构建请求数据
    const formData = new URLSearchParams();
    formData.append('status', content);
    formData.append('ck', ''); // CSRF token，可能需要从 Cookie 中提取

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Cookie': cookie,
                'Referer': 'https://www.douban.com/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: formData.toString()
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`豆瓣同步失败: ${response.status} - ${errorText}`);
        }

        const result = await response.json();

        // 检查豆瓣返回的结果
        if (result.r === 0) {
            return; // 成功
        } else {
            throw new Error(result.msg || '豆瓣同步失败');
        }
    } catch (error) {
        // 如果是网络错误，重新抛出
        if (error.message.includes('豆瓣同步失败')) {
            throw error;
        }
        throw new Error(`豆瓣同步失败: ${error.message}`);
    }
}
