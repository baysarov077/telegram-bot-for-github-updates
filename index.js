const { Telegraf } = require('telegraf');
const axios = require('axios');

const mongoose = require('mongoose');
mongoose.connect(process.env.DB_URL, { useNewUrlParser: true, useUnifiedTopology: true });
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

const subscriptionSchema = new mongoose.Schema({
  chatId: Number,
  repoUrl: String,
  filter: String
});

const Subscription = mongoose.model('Subscription', subscriptionSchema);

const bot = new Telegraf(process.env.BOT_TOKEN);

bot.start((ctx) => {
  ctx.reply('Привет! Я буду оповещать тебя о комитах на GitHub. Для начала работы введи /subscribe и укажи ссылку на репозиторий.');
});

bot.command('subscribe', async (ctx) => {
  const chatId = ctx.chat.id;
  const args = ctx.message.text.split(' ').slice(1);
  const repoUrl = args[0];

  try {
    const { data: repo } = await axios.get(`https://api.github.com/repos/${repoUrl}`);

    const subscription = new Subscription({ chatId, repoUrl });
    await subscription.save();

    ctx.reply(`Вы успешно подписались на оповещения о комитах в репозитории ${repo.full_name}`);
  } catch (e) {
    console.log(e);
    ctx.reply('Ошибка при подписке на репозиторий. Убедитесь, что ссылка на репозиторий корректна и доступна публично.');
  }
});

bot.command('unsubscribe', async (ctx) => {
  const chatId = ctx.chat.id;
  const args = ctx.message.text.split(' ').slice(1);
  const repoUrl = args[0];

  try {
    await Subscription.findOneAndDelete({ chatId, repoUrl });

    ctx.reply(`Вы успешно отписались от оповещений о комитах в репозитории ${repoUrl}`);
  } catch (e) {
    console.log(e);
    ctx.reply('Ошибка при отписке от репозитория. Убедитесь, что ссылка на репозиторий корректна и вы подписаны на этот репозиторий.');
  }
});

bot.on('text', async (ctx) => {
  const chatId = ctx.chat.id;

  try {
    const subscriptions = await Subscription.find({ chatId });

    for (const subscription of subscriptions) {
      const { data: commits } = await axios.get(`https://api.github.com/repos/${subscription.repoUrl}/commits`);
      const lastFiveCommits = commits.slice(0, 5);

      ctx.reply(`Последние комиты  врепозитории ${subscription.repoUrl}:`);
      for (const commit of lastFiveCommits) {
        if (subscription.filter) {
          if (commit.commit.message.toLowerCase().includes(subscription.filter.toLowerCase())) {
            ctx.reply(`Автор: ${commit.commit.author.name}\nСообщение: ${commit.commit.message}\n`);
          }
        } else {
          ctx.reply(`Автор: ${commit.commit.author.name}\nСообщение: ${commit.commit.message}\n`);
        }
      }
    }
  } catch (e) {
    console.log(e);
    ctx.reply('Ошибка при получении комитов из репозитория. Убедитесь, что ссылка на репозиторий корректна и доступна публично.');
    }
    });
    
    bot.launch();
    console.log('Бот запущен');    
