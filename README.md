## Rednote AI Agent

Rednote AI Agent 是一个专为 **Rednote** 设计的 AI 驱动自动化工具，用于自动化社交媒体互动，如点赞，收藏和评论。它利用先进的 AI 模型来生成引人入胜的内容、自动化互动并高效管理 Rednote 账户。

## 功能特性

- **Rednote 自动化**：自动登录、搜索帖子、点赞帖子、收藏帖子并留下有见地的评论。
- **AI 驱动内容生成**：使用 Google AI 创建引人入胜的标题和评论。
- **智能交互选择**：启动时可选择执行点赞、收藏、评论等操作，支持多选或仅浏览。
- **精确元素定位**：使用精确的CSS选择器确保操作正确的交互元素。
- **代理支持**：使用代理管理多个账户并避免频率限制。
- **Cookie 管理**：保存和加载 cookies 以在重启后维持会话。
- **详细日志记录**：记录每个帖子的信息和操作结果，便于调试和监控。

**即将推出的功能：**

- 发布新帖。

## 安装

1. **克隆仓库**：

   ```sh
   git clone https://github.com/lukailun/Rednote-AI-Agent.git
   cd Rednote-AI-Agent
   ```

2. **安装依赖**：

   ```sh
   npm install
   ```

3. **设置环境变量**：
   将根目录中的 `.env.example` 文件重命名为 `.env` 并添加您的 Rednote 凭据。请参考 `.env.example` 文件了解所需的变量。
   ```dotenv # Rednote 凭据
   MONGODB_URI= #MongoDB URI
   ```

## MongoDB 设置（使用 Docker）

1. **安装 Docker**：
   如果您还没有安装 Docker，请从[官方网站](https://www.docker.com/products/docker-desktop/)下载并安装。

2. **使用 Docker 容器运行 MongoDB**：

    **选项 1：**
      ```sh
      docker run -d -p 27017:27017 --name rednote-ai-mongodb mongodb/mongodb-community-server:latest
      ```
    **选项 2：**
      ```sh
      docker run -d -p 27017:27017 --name rednote-ai-mongodb -v mongodb_data:/data/db mongodb/mongodb-community-server:latest
      ```   
      （选项 2：如果您想要永久存储，以便在停止或删除 Docker 容器时数据不会丢失，请使用此选项）

3. **修改 .env 文件中的 MONGODB_URI**：
   ```dotenv
   MONGODB_URI=mongodb://localhost:27017/rednote-ai-agent
   ```

4. **验证连接**：
   打开新的终端并运行以下命令：
   ```sh
   docker ps
   ```
   您应该看到 MongoDB 容器正在运行。

   Docker 命令（附加信息）：
   - 停止 MongoDB 容器：
     ```sh
     docker stop rednote-ai-mongodb
     ```
   - 启动 MongoDB 容器：
       ```sh
       docker start rednote-ai-mongodb
       ```
   - 删除 MongoDB 容器：
      ```sh
      docker rm rednote-ai-mongodb
      ```
   - 删除 MongoDB 容器及其数据：
      ```sh
      docker rm -v rednote-ai-mongodb
      ```

## 使用方法

1. **运行 Rednote 代理**：
   ```sh
   npm start
   ```

2. **选择操作类型**：
   程序启动后会提示选择要执行的操作：
   ```
   === 选择要执行的操作 ===
   1. 点赞
   2. 收藏
   3. 评论
   输入数字（按回车仅浏览），用逗号分隔（例如：1,2,3）：
   你的选择：
   ```
   - 输入单个数字（如：1）执行单个操作
   - 输入多个数字（如：1,2,3）执行多个操作
   - 直接按回车仅浏览帖子，不执行任何操作

3. **搜索带有关键词的帖子**：
   ```
   搜索带有关键词的帖子（按回车跳过搜索）：
   ```
   - 输入关键词搜索帖子
   - 按回车跳过搜索，浏览首页内容

4. **自动执行**：
   程序会自动执行选择的操作，包括：
   - 登录验证（使用保存的cookies或二维码登录）
   - 搜索帖子（如果输入了关键词）
   - 浏览帖子并执行选择的操作
   - 记录详细的操作日志

## 项目结构

- **src/client**：包含与 Rednote 平台交互的主要逻辑。
- **src/config**：配置文件，包括日志记录器设置。
- **src/utils**：用于处理错误、cookies、数据保存等的实用函数。
- **src/Agent**：包含 AI 代理逻辑和训练脚本。
- **src/Agent/training**：AI 代理的训练脚本。
- **src/schema**：AI 生成内容和数据库模型的模式定义。
- **src/test**：包含 Rednote 自动化的测试数据和脚本。

## 日志记录

项目使用自定义日志记录器来记录信息、警告和错误。日志保存在 `logs` 目录中。

## 错误处理

设置了进程级错误处理器来捕获未处理的 Promise 拒绝、未捕获的异常和进程警告。错误使用自定义日志记录器进行记录。

## 许可证

本项目采用 MIT 许可证。详情请参阅 LICENSE 文件。

## 致谢

- [Google AI](https://ai.google/tools/) 提供 AI 模型。
- [Puppeteer](https://github.com/puppeteer/puppeteer) 用于浏览器自动化。
- [puppeteer-extra](https://github.com/berstend/puppeteer-extra) 用于额外的插件和增强功能。 