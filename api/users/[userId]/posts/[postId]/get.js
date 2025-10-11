const BaseAPI = require('easy-mcp-server/base-api');

/**
 * @description Get a specific post for a user
 * @summary Retrieve a user's post
 * @param {string} userId - The ID of the user
 * @param {string} postId - The ID of the post
 */
class GetUserPost extends BaseAPI {
  process(req, res) {
    const { userId, postId } = req.params;
    res.json({
      success: true,
      data: { userId, postId },
      message: `Fetched post ${postId} for user ${userId}`
    });
  }
}

module.exports = GetUserPost;

