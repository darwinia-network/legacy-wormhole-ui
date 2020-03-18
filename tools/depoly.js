
var ghpages = require('gh-pages');

export default async function() {
    ghpages.publish('build', {
        branch: 'master',
        repo: 'git@github.com:darwinia-network/home.git'
    }, function(res) {
        console.log(res)
    });
};
