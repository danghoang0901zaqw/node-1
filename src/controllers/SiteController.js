class SiteController {
  index(){
    return 'Welcome to the site';
  }
  search(){
    return 'Searching for something';
  }
}
module.exports = new SiteController();
