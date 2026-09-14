/**
 * Short, punchy, catchy & hilarious craft-inspired prompts for Messenger Custom Orders.
 * Zero emojis/icons — clean, short modern Taglish humor with diverse relatable scenarios.
 */
export const MESSENGER_URL = process.env.NEXT_PUBLIC_MESSENGER_URL || 'https://m.me/61587268312750';

export const CUSTOM_ORDER_TEMPLATE = `Hi M&M's Artsy! Inquire po sana ako for a custom handmade order. 😊`;

export const CUSTOM_ORDER_MESSENGER_URL = `https://m.me/61587268312750?text=${encodeURIComponent(CUSTOM_ORDER_TEMPLATE)}`;

export const FUN_CUSTOM_PROMPTS = [
  {
    title: 'May Pinterest peg ka?',
    subtitle: 'Lapag mo screenshot mo sa Messenger, gagawan natin ng paraan.',
    buttonText: 'Chat on Messenger',
    templateText: 'Hi M&M Artsy! May Pinterest/custom peg po akong gusto ipagawa sa inyo.',
  },
  {
    title: 'Wala bang pang-suyo dito?',
    subtitle: 'Send mo custom peg mo, bati agad kayo niyan.',
    buttonText: 'Order sa Messenger',
    templateText: 'Hi M&M Artsy! Inquire po sana ako ng custom handmade gift order para sa partner ko.',
  },
  {
    title: 'Gusto mo ng hindi basic?',
    subtitle: 'Send mo lang peg mo, kami na bahala mag-magic.',
    buttonText: 'Ipa-Custom Mo Na',
    templateText: 'Hi M&M Artsy! Gusto ko po magpagawa ng unique customized handmade craft.',
  },
  {
    title: 'Bawal mag-overthink ng regalo!',
    subtitle: 'Picture lang kailangan namin, kami na mag-craft para sa’yo.',
    buttonText: 'Chat with Artisan',
    templateText: 'Hi M&M Artsy! Magpapatulong po sana ako pumili o magpagawa ng customized gift.',
  },
  {
    title: 'Walang ganito sa mall no?',
    subtitle: 'Handmade kasi! Send your photo at gawa tayo ng unique piece.',
    buttonText: 'Send Peg sa Messenger',
    templateText: 'Hi M&M Artsy! May photo peg po ako na gusto kong ipa-recreate.',
  },
  {
    title: 'May paboritong color combo?',
    subtitle: 'Pili ka ng colors at style, itatahi o i-wo-wire namin with love.',
    buttonText: 'Ipa-Customize Mo Na',
    templateText: 'Hi M&M Artsy! Inquire po ako for custom colors and design ng handmade piece.',
  },
  {
    title: 'Para sa favorite person mo?',
    subtitle: 'I-send mo ang peg niya, gagawan natin ng personalized version.',
    buttonText: 'Order sa Messenger',
    templateText: 'Hi M&M Artsy! Magpapagawa po sana ako ng special personalized handmade gift.',
  },
  {
    title: 'Nakita mo sa TikTok o Reels?',
    subtitle: 'Send mo video o screenshot, kayang-kaya i-recreate yan.',
    buttonText: 'Chat on Messenger',
    templateText: 'Hi M&M Artsy! May nakita po akong viral handmade craft sa TikTok/Reels na gusto ko ipagawa.',
  },
  {
    title: 'Custom order yarn?',
    subtitle: 'Kahit anong weird o cute na idea, game ang artisans natin.',
    buttonText: 'Usap Tayo sa Messenger',
    templateText: 'Hi M&M Artsy! Ask ko lang po kung pwede magpagawa ng custom project.',
  },
  {
    title: 'Anniversary o Monthsary emergency?',
    subtitle: 'Huwag mataranta! Message us at gawan natin ng espesyal na craft.',
    buttonText: 'Message Us Agad',
    templateText: 'Hi M&M Artsy! Urgent/Rush inquiry po sana para sa anniversary/special occasion gift.',
  },
  {
    title: 'Flower na hindi nalalanta?',
    subtitle: 'Fuzzy wire bouquet, ikaw ang masusunod sa design.',
    buttonText: 'Pagawa ng Bouquet',
    templateText: 'Hi M&M Artsy! Inquire po ako para sa everlasting fuzzy wire bouquet order.',
  },
  {
    title: 'Wala sa catalog ang bet mo?',
    subtitle: 'Walang limit ang creativity dito. Chat mo lang kami sa Messenger.',
    buttonText: 'Start Custom Order',
    templateText: 'Hi M&M Artsy! May custom craft design po ako na wala sa catalog, pwede po magpa-quote?',
  },
];

export function getPromptMessengerUrl(prompt) {
  const text = prompt?.templateText || 'Hi M&M Artsy! Inquire po sana ako for a custom handmade order.';
  return `${MESSENGER_URL}?text=${encodeURIComponent(text)}`;
}

export function getProductCustomOrderTemplate(product) {
  const prodName = typeof product === 'string' ? product : (product?.name || 'Handmade Craft');
  return `Hi M&M's Artsy! Inquire po sana ako about "${prodName}". 😊`;
}

export function getProductCustomOrderMessengerUrl(product) {
  return `${MESSENGER_URL}?text=${encodeURIComponent(getProductCustomOrderTemplate(product))}`;
}

export function getRandomCustomPrompt() {
  const index = Math.floor(Math.random() * FUN_CUSTOM_PROMPTS.length);
  return FUN_CUSTOM_PROMPTS[index];
}
