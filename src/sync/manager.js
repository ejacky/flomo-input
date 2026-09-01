'use strict';

import { syncToDouban } from './douban.js';
import { syncToWeibo } from './weibo.js';
import { syncToXiaohongshu } from './xiaohongshu.js';

/**
 * 同步管理器：管理多平台内容同步
 * @param {string} content - 要同步的内容（已移除 #public 标签）
 * @returns {Promise<{success: string[], failed: Array<{platform: string, error: string}>}>}
 */
export async function syncToPlatforms(content) {
    const results = {
        success: [],
        failed: []
    };

    // 从 Chrome Storage 读取配置
    return new Promise((resolve) => {
        chrome.storage.sync.get(['publicSync'], (data) => {
            const config = data.publicSync || { platforms: {} };
            const platforms = config.platforms || {};

            // 收集所有需要同步的平台任务
            const syncTasks = [];

            // 豆瓣
            if (platforms.douban && platforms.douban.enabled && platforms.douban.cookie) {
                syncTasks.push(
                    syncToDouban(content, platforms.douban.cookie)
                        .then(() => ({ platform: '豆瓣', success: true }))
                        .catch((error) => ({ platform: '豆瓣', success: false, error: error.message }))
                );
            }

            // 微博
            if (platforms.weibo && platforms.weibo.enabled && platforms.weibo.cookie) {
                syncTasks.push(
                    syncToWeibo(content, platforms.weibo.cookie)
                        .then(() => ({ platform: '微博', success: true }))
                        .catch((error) => ({ platform: '微博', success: false, error: error.message }))
                );
            }

            // 小红书
            if (platforms.xiaohongshu && platforms.xiaohongshu.enabled && platforms.xiaohongshu.cookie) {
                syncTasks.push(
                    syncToXiaohongshu(content, platforms.xiaohongshu.cookie)
                        .then(() => ({ platform: '小红书', success: true }))
                        .catch((error) => ({ platform: '小红书', success: false, error: error.message }))
                );
            }

            // 如果没有配置任何平台，直接返回
            if (syncTasks.length === 0) {
                resolve(results);
                return;
            }

            // 并行执行所有同步任务
            Promise.allSettled(syncTasks).then((settledResults) => {
                settledResults.forEach((result) => {
                    if (result.status === 'fulfilled') {
                        const { platform, success, error } = result.value;
                        if (success) {
                            results.success.push(platform);
                        } else {
                            results.failed.push({ platform, error });
                        }
                    } else {
                        // Promise.allSettled 不应该到这里，但为了安全起见
                        results.failed.push({ platform: '未知', error: result.reason?.message || '未知错误' });
                    }
                });

                resolve(results);
            });
        });
    });
}
