'use strict';

/**
 * 同步内容到小红书笔记
 * @param {string} content - 要发布的内容
 * @param {string} cookie - 小红书 Cookie
 * @returns {Promise<void>}
 */
export async function syncToXiaohongshu(content, cookie) {
    // 小红书笔记发布接口
    // 注意：这个接口可能需要根据实际情况调整
    const url = 'https://edith.xiaohongshu.com/api/sns/web/v1/note';

    // 构建请求数据
    const requestData = {
        title: content.length > 20 ? content.substring(0, 20) : content, // 标题取前20字
        desc: content, // 描述为完整内容
        type: 'normal', // 笔记类型
        cover: '', // 封面图片
        images: [], // 图片列表
        topics: [], // 话题列表
        at_users: [] // @用户列表
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': cookie,
                'Referer': 'https://www.xiaohongshu.com/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify(requestData)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`小红书同步失败: ${response.status} - ${errorText}`);
        }

        const result = await response.json();

        // 检查小红书返回的结果
        if (result.success || result.code === 0) {
            return; // 成功
        } else {
            throw new Error(result.msg || result.message || '小红书同步失败');
        }
    } catch (error) {
        // 如果是网络错误，重新抛出
        if (error.message.includes('小红书同步失败')) {
            throw error;
        }
        throw new Error(`小红书同步失败: ${error.message}`);
    }
}
