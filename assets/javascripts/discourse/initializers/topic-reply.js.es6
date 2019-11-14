import { withPluginApi } from "discourse/lib/plugin-api";
import DiscourseURL from "discourse/lib/url";
import Composer from "discourse/models/composer";
import Draft from "discourse/models/draft";
import { scheduleOnce } from "@ember/runloop";
function initializeTestPlugin(api) {
	api.modifyClass('route:topic-from-params', {
		beforeModel(transition) {
			 if(transition.to.queryParams.sendmessage){
				 this.set("replyTOMes",true);
				 this.set("messBody",transition.to.queryParams.messagebody);
				 this.set("projectidc",transition.to.queryParams.projectid);
				 this.set("metadatac",transition.to.queryParams.metadata);
			 }
		 },
		  setupController(controller, params) {
		    params = params || {};
		    params.track_visit = true;
		    const self = this,
		      topic = this.modelFor("topic"),
		      postStream = topic.get("postStream"),
		      topicController = this.controllerFor("topic"),
		      composerController = this.controllerFor("composer");
		    if (params.nearPost === "last") {
		      params.nearPost = 999999999;
		    }
		    params.forceLoad = true;
		    postStream
		      .refresh(params)
		      .then(function() {
		        const closestPost = postStream.closestPostForPostNumber(
		          params.nearPost || 1
		        );
		        const closest = closestPost.get("post_number");
		        topicController.setProperties({
		          "model.currentPost": closest,
		          enteredIndex: topic
		            .get("postStream")
		            .progressIndexOfPost(closestPost),
		          enteredAt: new Date().getTime().toString()
		        });
		        topicController.subscribe();
		        scheduleOnce("afterRender", function() {
		          self.appEvents.trigger("post:highlight", closest);
		        });
		        const opts = {};
		        if (document.location.hash && document.location.hash.length) {
		          opts.anchor = document.location.hash;
		        }
		        DiscourseURL.jumpToPost(closest, opts);
		        if (!Ember.isEmpty(topic.get("draft"))) {
		        	if(!self.get("replyTOMes")){
		        		composerController.open({
				            draft: Draft.getLocal(topic.get("draft_key"), topic.get("draft")),
				            draftKey: topic.get("draft_key"),
				            draftSequence: topic.get("draft_sequence"),
				            topic: topic,
				            ignoreIfChanged: true
				          });
		        	}
		        }
		        const opts1 = {
						action: Composer.REPLY,
						draftKey: topic.get("draft_key"),
						draftSequence: topic.get("draft_sequence"),
						topicBody:self.get("messBody"),
						skipDraftCheck:true,
						
				};
		        if(closest != 1){
		        	opts1.post = closestPost;
		        }
		        opts1.topic = topic
				if( self.get("replyTOMes")){
					var controllerModelPromise = composerController.open(opts1);
					controllerModelPromise.then(result => {
						var composerController = self.controllerFor("composer");
						composerController.set("model.projectidc",self.get("projectidc"))
						composerController.set("model.metadatac", self.get("metadatac"));
						self.set("projectidC",undefined); 
				        self.set("metadataC",undefined); 
					});
				}
		        self.set("replyTOMes",undefined); 
		        self.set("messBody",undefined);
		      

		      })
		      .catch(e => {
		        if (!Ember.testing) {
		          console.log("Could not view topic", e);
		        }
		      });
		  }
	});
}
export default {
	name: "topic-reply.js",
	initialize() {
		withPluginApi("0.1", initializeTestPlugin);
	}
};
