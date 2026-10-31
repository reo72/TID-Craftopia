export const variables={values:{portal_url:'https://portal.example.test/',discord_webhook_url:'https://discord.com/api/webhooks/1/abc'},get(name){return this.values[name];},get names(){return Object.keys(this.values);}};
export const secrets={values:{game_api_key:'Bearer test-key'},get(name){return this.values[name];}};
