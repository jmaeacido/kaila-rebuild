/*
 Navicat Premium Dump SQL

 Source Server         : KAILA
 Source Server Type    : MySQL
 Source Server Version : 80046 (8.0.46-0ubuntu0.24.04.3)
 Source Host           : 127.0.0.1:3306
 Source Schema         : kaila_mvp

 Target Server Type    : MySQL
 Target Server Version : 80046 (8.0.46-0ubuntu0.24.04.3)
 File Encoding         : 65001

 Date: 16/07/2026 13:06:49
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for activities
-- ----------------------------
DROP TABLE IF EXISTS `activities`;
CREATE TABLE `activities`  (
  `id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(160) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `detail` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of activities
-- ----------------------------
INSERT INTO `activities` VALUES ('1007c393-dd2a-4e9a-b2ae-d335b77d4aea', 'Request edited', 'Appliance repair in Purok 2, Barangay 20, City of Gingoog, Misamis Oriental', '2026-06-15 23:32:42');
INSERT INTO `activities` VALUES ('1212478b-4f50-4baf-b0f0-9080439e8a4c', 'Feed post deleted', 'KAILA Admin deleted a feed post', '2026-06-23 09:51:07');
INSERT INTO `activities` VALUES ('14481f56-72f1-4fc8-b89b-cc5fb144d9b7', 'Feed post created', 'KAILA posted to the public feed', '2026-06-23 13:03:05');
INSERT INTO `activities` VALUES ('1e98913e-f160-4314-b816-6d7f786c5932', 'Feed post edited', 'KAILA Admin edited a public feed post', '2026-06-23 10:07:23');
INSERT INTO `activities` VALUES ('1ec3c3d5-a6ee-44da-b024-d8e969129d8d', 'Offer sent', '700.00 for Appliance repair', '2026-06-13 15:21:29');
INSERT INTO `activities` VALUES ('23416664-c1d8-422e-a530-22ef881f1211', 'Feed post created', 'KAILA posted to the public feed', '2026-06-14 11:38:11');
INSERT INTO `activities` VALUES ('28b9d898-ef3b-4685-9ca6-4169c26d99ad', 'User registered', 'Codex UI Test joined as client', '2026-06-15 23:07:31');
INSERT INTO `activities` VALUES ('2d376985-92ea-475f-aeb7-eff51165ce05', 'User registered', 'Codex Social Test joined as client', '2026-06-13 21:14:22');
INSERT INTO `activities` VALUES ('31b0e0fd-0622-44c2-8ab9-6343da4b1eb7', 'User registered', 'Azis Dida-agun (teo) joined with google', '2026-06-23 07:08:51');
INSERT INTO `activities` VALUES ('42b8b4c7-ff47-41b4-8436-b3f037f2b078', 'Profile updated', 'John Mark Agustin Estrosos Acido updated profile settings', '2026-06-13 13:06:07');
INSERT INTO `activities` VALUES ('57522e66-2fea-447e-b0be-d566b27b4e0a', 'Profile updated', 'Andy Amporias updated profile settings', '2026-06-23 13:12:21');
INSERT INTO `activities` VALUES ('57990036-fe04-49ea-be3a-e7ea3de08acb', 'Feed post edited', 'KAILA Admin edited a public feed post', '2026-06-13 16:25:58');
INSERT INTO `activities` VALUES ('65b1c11f-491b-49fb-b6c7-a233b45335a8', 'Feed post created', 'KAILA posted to the public feed', '2026-06-23 12:01:06');
INSERT INTO `activities` VALUES ('66aade9b-d9b6-46a9-ba06-951a0c01060a', 'Account deleted', 'Deleted client removed their account', '2026-06-15 23:28:35');
INSERT INTO `activities` VALUES ('66f8866e-015f-4020-9e97-ccb791f02c28', 'Completion confirmed', 'Appliance repair is completed and payment is released', '2026-06-15 23:44:46');
INSERT INTO `activities` VALUES ('68a6d6fe-d66d-494d-bcad-1e9c25e8373d', 'User registered', 'Andy Amporias joined with google', '2026-06-23 13:09:10');
INSERT INTO `activities` VALUES ('6bbc6253-5d91-4548-87b1-ccaee0aa82c0', 'Profile updated', 'Codex Social Test updated profile settings', '2026-06-13 21:14:22');
INSERT INTO `activities` VALUES ('71349ccf-d91d-4708-aa05-cb7d91008c7b', 'Auto-confirmed', 'Cleaning for Maria Santos was auto-confirmed after 48 hours', '2026-06-13 14:53:30');
INSERT INTO `activities` VALUES ('740116e3-9bad-4e81-8e7a-0a0649794e8e', 'User registered', 'Ryan D. Patentis joined as provider', '2026-06-22 21:16:49');
INSERT INTO `activities` VALUES ('745d4393-3bc3-4a59-ac07-a21a837aaee0', 'Profile updated', 'KAILA Customer Service updated profile settings', '2026-06-13 15:18:01');
INSERT INTO `activities` VALUES ('77777dfe-e34d-493a-930a-7b513e929fcc', 'Account deleted', 'Deleted client removed their account', '2026-06-13 21:14:22');
INSERT INTO `activities` VALUES ('7c85a8b1-1811-4f9b-9508-1e43c1f9edd9', 'Profile updated', 'KAILA Admin updated profile settings', '2026-06-16 15:45:22');
INSERT INTO `activities` VALUES ('7dc76eda-a468-4a3a-a70f-dcff09d0ca96', 'Client rating submitted', 'Appliance repair received a client rating', '2026-06-15 23:45:00');
INSERT INTO `activities` VALUES ('7eb6be49-ef77-45bb-b590-fef5f524a8e1', 'Job started', 'Appliance repair is now in progress', '2026-06-13 15:23:39');
INSERT INTO `activities` VALUES ('7f45c8cc-d16c-493c-96df-a6f9e7584d9a', 'Report updated', 'KAILA Customer Service marked job report \'Other\' as In Review', '2026-06-15 23:35:22');
INSERT INTO `activities` VALUES ('85df81ba-96fb-4a91-a283-93adc99052c3', 'Provider marked done', 'Appliance repair is waiting for client confirmation', '2026-06-15 23:44:32');
INSERT INTO `activities` VALUES ('86a28450-32a0-46ad-83e3-ba83507fda97', 'Feed post created', 'KAILA posted to the public feed', '2026-06-14 16:03:13');
INSERT INTO `activities` VALUES ('88275b9d-a885-41b8-a01e-dcce9bf3a6d7', 'Account deleted', 'Deleted client removed their account', '2026-06-13 22:02:28');
INSERT INTO `activities` VALUES ('88e98446-8a0d-4963-9547-1ba2aeaddee6', 'Profile updated', 'KAILA Admin updated profile settings', '2026-06-16 15:59:54');
INSERT INTO `activities` VALUES ('89e34671-b4b5-499f-9a70-809ef15cade2', 'Profile updated', 'KAILA Admin updated profile settings', '2026-06-16 15:59:38');
INSERT INTO `activities` VALUES ('8a60ca70-8a96-48de-a1b5-f6177aa88218', 'Report updated', 'KAILA Customer Service marked job report \'Other\' as Closed', '2026-06-15 23:35:38');
INSERT INTO `activities` VALUES ('8a6f086d-bac5-49b6-a31e-c3ed88ad2d0f', 'Account updated', 'KAILA Super Admin deleted provider1', '2026-06-23 13:57:58');
INSERT INTO `activities` VALUES ('8d983a59-2d81-44c8-8889-889542c01467', 'Feed post edited', 'KAILA Super Admin edited a public feed post', '2026-06-23 12:42:29');
INSERT INTO `activities` VALUES ('8e6baf7c-16c9-4e27-bc98-32eae5aa3c61', 'Feed post edited', 'KAILA Admin edited a public feed post', '2026-06-13 16:25:46');
INSERT INTO `activities` VALUES ('8ee3fcd6-c24c-4292-933a-58ae332c866e', 'Completion confirmed', 'Appliance repair is completed and payment is released', '2026-06-13 15:25:26');
INSERT INTO `activities` VALUES ('8fb68211-213e-4c2a-86d9-0a54309ca506', 'User registered', 'John Mark Agustin Acido joined with google', '2026-06-14 08:41:21');
INSERT INTO `activities` VALUES ('92592e45-4f9f-47b3-8187-78160007afd3', 'Account deleted', 'Deleted client removed their account', '2026-06-14 08:22:04');
INSERT INTO `activities` VALUES ('975d3021-053a-48eb-abf7-73aa570d86a4', 'User registered', 'John Mark Agustin Acido joined with facebook', '2026-06-14 08:22:39');
INSERT INTO `activities` VALUES ('9cebcd30-39e2-4b45-a440-22611c6d420c', 'Job started', 'Appliance repair is now in progress', '2026-06-15 23:43:56');
INSERT INTO `activities` VALUES ('a518438d-c8d4-4336-8723-fb82f1b5656b', 'Request posted', 'Appliance repair in Purok 2, Barangay 20, City of Gingoog, Misamis Oriental', '2026-06-14 15:20:36');
INSERT INTO `activities` VALUES ('a6a91cca-ceb9-42db-981e-d819523dfaa1', 'Account created', 'KAILA Admin created Provider 1 as provider', '2026-06-15 23:42:14');
INSERT INTO `activities` VALUES ('aa39f201-17ba-4f26-8268-471d2be3baae', 'Feed post created', 'KAILA posted to the public feed', '2026-06-13 16:17:26');
INSERT INTO `activities` VALUES ('ad399d33-79a8-4bb0-a100-15d2f4b8e62e', 'Account updated', 'KAILA Super Admin deactivated provider1', '2026-06-23 10:43:27');
INSERT INTO `activities` VALUES ('b336addd-f159-49c6-91bf-b320d0c91eca', 'Account created', 'KAILA Super Admin created KAILA Admin as admin', '2026-06-23 10:47:20');
INSERT INTO `activities` VALUES ('b53f0175-2d79-494a-b713-5f8dc41fe223', 'Request posted', 'Appliance repair in Purok 2, Barangay 20, City of Gingoog, Misamis Oriental', '2026-06-15 23:29:02');
INSERT INTO `activities` VALUES ('ba9c9a1a-1960-4c66-a257-519ee995866d', 'User registered', 'John Mark Agustin Acido joined with facebook', '2026-06-14 09:47:17');
INSERT INTO `activities` VALUES ('bf214169-b82f-427c-94b4-824e5eb61336', 'User registered', 'John Mark Agustin Acido joined with google', '2026-06-14 08:19:04');
INSERT INTO `activities` VALUES ('bf642b33-dc59-4ff2-a759-b9c77f15ea31', 'Provider saved', 'John Mark Agustin Acido - Plumbing, Electrical, Computer repair, Graphic / digital services, General odd jobs', '2026-06-14 15:18:18');
INSERT INTO `activities` VALUES ('c211d685-ab9f-4fed-a766-e8ec6c7d26d0', 'Client rating submitted', 'Appliance repair received a client rating', '2026-06-13 15:25:33');
INSERT INTO `activities` VALUES ('c22e98bf-dce3-420b-9066-fb1cc2b513c9', 'Offer sent', '1500.00 for Appliance repair', '2026-06-15 23:42:56');
INSERT INTO `activities` VALUES ('c2a43d28-ff6a-407f-9e72-f715a1d55eb6', 'User registered', 'John Mark Agustin Acido joined with google', '2026-06-14 08:01:27');
INSERT INTO `activities` VALUES ('c5f12df9-6a36-495c-872c-994f962cc9ca', 'Feed post edited', 'KAILA Admin edited a public feed post', '2026-06-14 11:20:44');
INSERT INTO `activities` VALUES ('cb5df0b4-a1b4-402e-9e3f-610448d961b2', 'Account deleted', 'Deleted client removed their account', '2026-06-14 08:02:52');
INSERT INTO `activities` VALUES ('cf92a662-ccee-4496-a7d0-70bf5799bd0d', 'Profile updated', 'KAILA Admin updated profile settings', '2026-06-16 15:37:42');
INSERT INTO `activities` VALUES ('d0b8ec68-9fba-4314-bc2b-ced94ef263a5', 'Provider marked done', 'Appliance repair is waiting for client confirmation', '2026-06-13 15:25:05');
INSERT INTO `activities` VALUES ('d10275f2-30a6-4853-864b-7b5f73ef7837', 'Offer accepted', 'Appliance repair for John Mark Agustin Acido', '2026-06-15 23:43:43');
INSERT INTO `activities` VALUES ('d23ddfa3-0c07-44fe-b9fa-5b4a13b850cb', 'Provider rating submitted', 'Appliance repair received a provider rating', '2026-06-15 23:45:14');
INSERT INTO `activities` VALUES ('d2e4b373-bffd-430b-b6d8-8bf47b522284', 'Request posted', 'Appliance repair in Purok 2, Barangay 20, City of Gingoog, Misamis Oriental', '2026-06-13 15:20:29');
INSERT INTO `activities` VALUES ('d82017a6-e5d7-4c4a-9e47-8ee326d41526', 'Account created', 'KAILA Super Admin created KAILA Admin as admin', '2026-06-23 11:08:55');
INSERT INTO `activities` VALUES ('demo-act-1', 'Demo request posted', 'Maria Santos posted a plumbing request in Barangay 22.', '2026-06-13 00:22:53');
INSERT INTO `activities` VALUES ('demo-act-2', 'Offer selected', 'Anne Cabahug selected Marco Padilla for electrical work.', '2026-06-13 02:22:53');
INSERT INTO `activities` VALUES ('demo-act-3', 'Live job tracking', 'Marco Padilla is on the way to an in-progress home repair job.', '2026-06-13 04:44:53');
INSERT INTO `activities` VALUES ('demo-act-4', 'Payment released', 'A beauty service job was confirmed and payment was released.', '2026-06-08 09:52:53');
INSERT INTO `activities` VALUES ('e1022bee-e7db-490d-a6aa-7caa96dc1070', 'Account created', 'KAILA Super Admin created KAILA Admin as admin', '2026-06-23 10:38:12');
INSERT INTO `activities` VALUES ('eb8295fb-a345-4a88-a375-069ab925f23e', 'Provider rating submitted', 'Appliance repair received a provider rating', '2026-06-13 15:26:52');
INSERT INTO `activities` VALUES ('ec97019a-2d5d-4d1b-ae40-48e5a286b649', 'Profile updated', 'John Mark Agustin Estrosos Acido updated profile settings', '2026-06-13 15:20:54');
INSERT INTO `activities` VALUES ('ed404a71-3b3b-40f1-b4f5-e58d907a29c1', 'Feed post deleted', 'KAILA Admin deleted a feed post', '2026-06-23 09:51:12');
INSERT INTO `activities` VALUES ('ed8f9da0-de81-453b-92d9-b60241373969', 'Job reported', 'KAILA Admin reported Appliance repair: Other', '2026-06-14 16:14:26');
INSERT INTO `activities` VALUES ('ed9b3a14-1eea-45e7-901c-08d2d669de19', 'User registered', 'John Mark Agustin Acido joined with facebook', '2026-06-13 22:01:44');
INSERT INTO `activities` VALUES ('ef16f10b-e2e5-472d-b454-597090f33662', 'User registered', 'John Mark Agustin Acido joined with facebook', '2026-06-14 08:21:36');
INSERT INTO `activities` VALUES ('ef2ba0a6-6c17-4667-8726-702f661e8872', 'Job cancelled', 'Appliance repair', '2026-06-14 15:34:23');
INSERT INTO `activities` VALUES ('f776d701-9af4-4137-8f4b-dfc0c976d90a', 'Offer accepted', 'Appliance repair for John Mark Agustin Estrosos Acido', '2026-06-13 15:22:43');
INSERT INTO `activities` VALUES ('ffc0c867-7067-4548-867a-f794216ba4ca', 'Profile updated', 'John Mark Agustin Acido updated profile settings', '2026-06-14 10:02:23');

-- ----------------------------
-- Table structure for audit_logs
-- ----------------------------
DROP TABLE IF EXISTS `audit_logs`;
CREATE TABLE `audit_logs`  (
  `id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `actor_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `actor_role` varchar(40) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `actor_name` varchar(160) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `action` varchar(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `target_type` varchar(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `target_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `target_label` varchar(190) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `metadata` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `ip_address` varchar(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `user_agent` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `audit_logs_created_idx`(`created_at` ASC) USING BTREE,
  INDEX `audit_logs_actor_idx`(`actor_id` ASC, `created_at` ASC) USING BTREE,
  INDEX `audit_logs_target_idx`(`target_type` ASC, `target_id` ASC, `created_at` ASC) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of audit_logs
-- ----------------------------
INSERT INTO `audit_logs` VALUES ('000c80bd-abbb-4011-a243-0f65ff0fcf1d', 'admin-jmaeacido', 'admin', 'KAILA Super Admin', 'account.delete', 'account', 'cf62db93-c4fe-442f-8428-0055dcac38a4', 'provider1 (provider)', '{\"role\":\"provider\",\"username\":\"provider1\",\"status\":\"deleted\"}', '175.176.80.194', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', '2026-06-23 13:57:58');
INSERT INTO `audit_logs` VALUES ('25f40e6c-a326-44e0-b012-0486ee5d7bbd', 'admin-jmaeacido', 'admin', 'KAILA Super Admin', 'account.create', 'account', 'ddf1e21a-0587-40c0-8a9f-83ed1be208d2', 'mksbuzon (admin)', '{\"role\":\"admin\",\"username\":\"mksbuzon\"}', '175.176.81.206', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', '2026-06-23 11:08:55');

-- ----------------------------
-- Table structure for conversation_access_audit
-- ----------------------------
DROP TABLE IF EXISTS `conversation_access_audit`;
CREATE TABLE `conversation_access_audit`  (
  `id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `viewer_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `viewer_role` varchar(40) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `scope` enum('job','direct') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `request_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `thread_id` varchar(160) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `reason` varchar(160) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `conversation_access_audit_viewer_idx`(`viewer_id` ASC, `created_at` ASC) USING BTREE,
  INDEX `conversation_access_audit_thread_idx`(`scope` ASC, `thread_id` ASC, `created_at` ASC) USING BTREE,
  CONSTRAINT `conversation_access_audit_viewer_fk` FOREIGN KEY (`viewer_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of conversation_access_audit
-- ----------------------------
INSERT INTO `conversation_access_audit` VALUES ('22d60b00-637d-4478-8778-1ae12cd88b27', 'admin-jmaeacido', 'admin', 'job', 'e903e18a-c397-4d25-b31a-e9bbece906c3', 'e903e18a-c397-4d25-b31a-e9bbece906c3', 'admin_review', '2026-06-13 20:20:52');
INSERT INTO `conversation_access_audit` VALUES ('596fa213-c68f-44eb-a09b-541a5c4dd69a', 'admin-jmaeacido', 'admin', 'direct', NULL, '88efec24-d222-4497-82b8-96309d688f1a:admin-jmaeacido:', 'direct_support', '2026-06-23 16:25:53');
INSERT INTO `conversation_access_audit` VALUES ('76d24539-3c68-479c-a2e6-5e9161ce04d3', 'admin-jmaeacido', 'admin', 'direct', NULL, '88efec24-d222-4497-82b8-96309d688f1a:admin-jmaeacido:', 'direct_support', '2026-06-23 16:25:42');
INSERT INTO `conversation_access_audit` VALUES ('d768bf0c-7f36-44c5-a799-34fc7d042622', 'admin-jmaeacido', 'admin', 'direct', NULL, '88efec24-d222-4497-82b8-96309d688f1a:admin-jmaeacido:', 'direct_support', '2026-06-23 16:25:47');

-- ----------------------------
-- Table structure for direct_message_attachments
-- ----------------------------
DROP TABLE IF EXISTS `direct_message_attachments`;
CREATE TABLE `direct_message_attachments`  (
  `id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `message_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `original_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `mime_type` varchar(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `size_bytes` int NOT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `direct_message_attachments_message_fk`(`message_id` ASC) USING BTREE,
  CONSTRAINT `direct_message_attachments_message_fk` FOREIGN KEY (`message_id`) REFERENCES `direct_messages` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of direct_message_attachments
-- ----------------------------

-- ----------------------------
-- Table structure for direct_messages
-- ----------------------------
DROP TABLE IF EXISTS `direct_messages`;
CREATE TABLE `direct_messages`  (
  `id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `sender_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `recipient_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `sender_name` varchar(160) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `detail` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL,
  `kind` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'text',
  `call_metadata` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `request_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `direct_messages_pair_idx`(`sender_id` ASC, `recipient_id` ASC, `created_at` ASC) USING BTREE,
  INDEX `direct_messages_recipient_fk`(`recipient_id` ASC) USING BTREE,
  CONSTRAINT `direct_messages_recipient_fk` FOREIGN KEY (`recipient_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `direct_messages_sender_fk` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of direct_messages
-- ----------------------------

-- ----------------------------
-- Table structure for feed_comment_reactions
-- ----------------------------
DROP TABLE IF EXISTS `feed_comment_reactions`;
CREATE TABLE `feed_comment_reactions`  (
  `comment_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `reaction` enum('like','helpful','interested') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`comment_id`, `user_id`, `reaction`) USING BTREE,
  INDEX `feed_comment_reactions_user_idx`(`user_id` ASC, `created_at` ASC) USING BTREE,
  CONSTRAINT `feed_comment_reactions_comment_fk` FOREIGN KEY (`comment_id`) REFERENCES `feed_post_comments` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `feed_comment_reactions_user_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of feed_comment_reactions
-- ----------------------------

-- ----------------------------
-- Table structure for feed_media_comment_reactions
-- ----------------------------
DROP TABLE IF EXISTS `feed_media_comment_reactions`;
CREATE TABLE `feed_media_comment_reactions`  (
  `comment_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `reaction` enum('like','helpful','interested') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`comment_id`, `user_id`, `reaction`) USING BTREE,
  INDEX `feed_media_comment_reactions_user_idx`(`user_id` ASC, `created_at` ASC) USING BTREE,
  CONSTRAINT `feed_media_comment_reactions_comment_fk` FOREIGN KEY (`comment_id`) REFERENCES `feed_media_comments` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `feed_media_comment_reactions_user_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of feed_media_comment_reactions
-- ----------------------------

-- ----------------------------
-- Table structure for feed_media_comments
-- ----------------------------
DROP TABLE IF EXISTS `feed_media_comments`;
CREATE TABLE `feed_media_comments`  (
  `id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `media_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `author_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `body` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL,
  `parent_comment_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `hidden_by` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `hidden_at` datetime NULL DEFAULT NULL,
  `deleted_by` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `deleted_at` datetime NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `feed_media_comments_media_idx`(`media_id` ASC, `created_at` ASC) USING BTREE,
  INDEX `feed_media_comments_author_fk`(`author_id` ASC) USING BTREE,
  INDEX `feed_media_comments_parent_idx`(`parent_comment_id` ASC) USING BTREE,
  CONSTRAINT `feed_media_comments_author_fk` FOREIGN KEY (`author_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `feed_media_comments_media_fk` FOREIGN KEY (`media_id`) REFERENCES `feed_post_media` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of feed_media_comments
-- ----------------------------

-- ----------------------------
-- Table structure for feed_media_reactions
-- ----------------------------
DROP TABLE IF EXISTS `feed_media_reactions`;
CREATE TABLE `feed_media_reactions`  (
  `media_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `reaction` enum('like','helpful','interested') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`media_id`, `user_id`, `reaction`) USING BTREE,
  INDEX `feed_media_reactions_user_idx`(`user_id` ASC, `created_at` ASC) USING BTREE,
  CONSTRAINT `feed_media_reactions_media_fk` FOREIGN KEY (`media_id`) REFERENCES `feed_post_media` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `feed_media_reactions_user_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of feed_media_reactions
-- ----------------------------
INSERT INTO `feed_media_reactions` VALUES ('2ca80a13-0f0b-476a-8628-eb16d2edf502', 'admin-jmaeacido', 'like', '2026-06-23 10:07:31');
INSERT INTO `feed_media_reactions` VALUES ('760ee54e-a52a-48bf-8692-44e4f9871b96', 'admin-jmaeacido', 'like', '2026-06-23 13:00:39');
INSERT INTO `feed_media_reactions` VALUES ('cdc1fab7-31ea-42d2-842a-8fe71752e9d3', 'admin-jmaeacido', 'like', '2026-06-23 13:03:19');

-- ----------------------------
-- Table structure for feed_notifications
-- ----------------------------
DROP TABLE IF EXISTS `feed_notifications`;
CREATE TABLE `feed_notifications`  (
  `id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `recipient_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `actor_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `post_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `comment_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `type` varchar(40) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(160) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `body` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `feed_notifications_recipient_idx`(`recipient_id` ASC, `created_at` ASC) USING BTREE,
  INDEX `feed_notifications_actor_fk`(`actor_id` ASC) USING BTREE,
  INDEX `feed_notifications_post_fk`(`post_id` ASC) USING BTREE,
  INDEX `feed_notifications_comment_fk`(`comment_id` ASC) USING BTREE,
  CONSTRAINT `feed_notifications_actor_fk` FOREIGN KEY (`actor_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `feed_notifications_comment_fk` FOREIGN KEY (`comment_id`) REFERENCES `feed_post_comments` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT,
  CONSTRAINT `feed_notifications_post_fk` FOREIGN KEY (`post_id`) REFERENCES `feed_posts` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `feed_notifications_recipient_fk` FOREIGN KEY (`recipient_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of feed_notifications
-- ----------------------------

-- ----------------------------
-- Table structure for feed_post_comments
-- ----------------------------
DROP TABLE IF EXISTS `feed_post_comments`;
CREATE TABLE `feed_post_comments`  (
  `id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `post_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `author_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `body` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL,
  `parent_comment_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `hidden_by` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `hidden_at` datetime NULL DEFAULT NULL,
  `deleted_by` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `deleted_at` datetime NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `feed_post_comments_post_idx`(`post_id` ASC, `created_at` ASC) USING BTREE,
  INDEX `feed_post_comments_author_fk`(`author_id` ASC) USING BTREE,
  INDEX `feed_post_comments_parent_idx`(`parent_comment_id` ASC) USING BTREE,
  CONSTRAINT `feed_post_comments_author_fk` FOREIGN KEY (`author_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `feed_post_comments_post_fk` FOREIGN KEY (`post_id`) REFERENCES `feed_posts` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of feed_post_comments
-- ----------------------------

-- ----------------------------
-- Table structure for feed_post_media
-- ----------------------------
DROP TABLE IF EXISTS `feed_post_media`;
CREATE TABLE `feed_post_media`  (
  `id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `post_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `original_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `mime_type` varchar(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `size_bytes` int NOT NULL,
  `created_at` datetime NOT NULL,
  `share_count` int NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `feed_post_media_post_fk`(`post_id` ASC) USING BTREE,
  CONSTRAINT `feed_post_media_post_fk` FOREIGN KEY (`post_id`) REFERENCES `feed_posts` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of feed_post_media
-- ----------------------------
INSERT INTO `feed_post_media` VALUES ('2ca80a13-0f0b-476a-8628-eb16d2edf502', '305c7a15-838d-4bfb-a8e3-5f52db941283', '2ca80a13-0f0b-476a-8628-eb16d2edf502.jpg', 'icon-2ca80a13.jpg', 'image/jpeg', 71451, '2026-06-23 10:07:23', 0);
INSERT INTO `feed_post_media` VALUES ('760ee54e-a52a-48bf-8692-44e4f9871b96', 'f1a0385b-1b0d-4ee0-b7b9-e206a1b56eb1', '760ee54e-a52a-48bf-8692-44e4f9871b96.jpg', '728970213-27055632110775820-6208424150050065685--760ee54e.jpg', 'image/jpeg', 216410, '2026-06-23 12:01:06', 0);
INSERT INTO `feed_post_media` VALUES ('cdc1fab7-31ea-42d2-842a-8fe71752e9d3', '30e93def-216d-4de3-a68f-471494b501f7', 'cdc1fab7-31ea-42d2-842a-8fe71752e9d3.jpg', '728420249-27058391123833252-7654502826828950995--cdc1fab7.jpg', 'image/jpeg', 263779, '2026-06-23 13:03:05', 0);

-- ----------------------------
-- Table structure for feed_post_reactions
-- ----------------------------
DROP TABLE IF EXISTS `feed_post_reactions`;
CREATE TABLE `feed_post_reactions`  (
  `post_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `reaction` enum('like','helpful','interested') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`post_id`, `user_id`, `reaction`) USING BTREE,
  INDEX `feed_post_reactions_user_idx`(`user_id` ASC, `created_at` ASC) USING BTREE,
  CONSTRAINT `feed_post_reactions_post_fk` FOREIGN KEY (`post_id`) REFERENCES `feed_posts` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `feed_post_reactions_user_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of feed_post_reactions
-- ----------------------------
INSERT INTO `feed_post_reactions` VALUES ('305c7a15-838d-4bfb-a8e3-5f52db941283', 'admin-jmaeacido', 'interested', '2026-06-18 02:33:54');
INSERT INTO `feed_post_reactions` VALUES ('f1a0385b-1b0d-4ee0-b7b9-e206a1b56eb1', 'admin-jmaeacido', 'like', '2026-06-23 12:15:39');
INSERT INTO `feed_post_reactions` VALUES ('30e93def-216d-4de3-a68f-471494b501f7', 'admin-jmaeacido', 'like', '2026-06-23 13:03:29');

-- ----------------------------
-- Table structure for feed_posts
-- ----------------------------
DROP TABLE IF EXISTS `feed_posts`;
CREATE TABLE `feed_posts`  (
  `id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `author_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `body` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `visibility` enum('public','private') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'public',
  `post_as_official` tinyint(1) NOT NULL DEFAULT 0,
  `share_count` int NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `feed_posts_visibility_idx`(`visibility` ASC, `created_at` ASC) USING BTREE,
  INDEX `feed_posts_author_idx`(`author_id` ASC, `created_at` ASC) USING BTREE,
  CONSTRAINT `feed_posts_author_fk` FOREIGN KEY (`author_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of feed_posts
-- ----------------------------
INSERT INTO `feed_posts` VALUES ('305c7a15-838d-4bfb-a8e3-5f52db941283', 'admin-jmaeacido', '🔧🏠 Welcome to KAILA!\n\nNeed someone to fix a leaking faucet? Repair a cellphone? Install an aircon? Troubleshoot a computer? Do electrical work? Help with errands? Or maybe you\'re the one who can provide these services?\n\nKAILA connects people who need help with people who can help.\n\nWhether you\'re:\n✅ A skilled technician\n✅ A handyman\n✅ A home-based service provider\n✅ A shop owner\n✅ A freelancer\n✅ Or simply someone with experience and a willingness to work\n\nYou\'re welcome here.\n\nLikewise, if you\'re looking for trusted local help, you can post your service needs and receive offers from available providers.\n\n💡 No formal certification required. Real skills, experience, and good service matter. \n\nLet\'s build a stronger local community where opportunities are easier to find and help is only a few taps away.\n\n📍 Invite your friends, neighbors, family members, and local businesses to join KAILA.\n\nFind work. Find help. Get things done.\n\n#KAILA #KailaApp #GingoogCity #MisamisOriental #SupportLocal #Handyman #HomeServices #TechSupport #RepairServices #LocalJobs #CommunityMarketplace', 'public', 1, 0, '2026-06-13 16:17:26', '2026-06-23 10:07:23');
INSERT INTO `feed_posts` VALUES ('30e93def-216d-4de3-a68f-471494b501f7', 'admin-jmaeacido', '🎉 Another milestone for KAILA!\n\nWe\'re happy to welcome *KonekFix Gadget Repair Services* as one of our newest service providers on KAILA.\n\nA warm welcome to @Azis Dida-agun (teo)  for believing in our vision of connecting customers with trusted local service providers.\n\n📱 Services Offered:\n🍎 iPhone Specialist\n⚙️ Gadget Troubleshooting & Maintenance\n\n📍 Location:\nP9 Limaha St., Campos, Langihan, Butuan City, Philippines\n\n👍 Facebook Page:\n*KonekFix Gadget Repair Services*\n\nLooking for reliable iPhone and gadget repair services in Butuan City? Comment below or send us a message.\n\nPlease support and follow *KonekFix Gadget Repair Services* for updates and service inquiries.\n\nThank you, @Azis Dida-agun (teo) , for joining the growing KAILA community. 💙\n\nHere\'s to building a stronger service community together!\n\n#KAILA #LocalServices #ButuanCity #iPhoneSpecialist #GadgetRepair #KonekFix #iPhoneRepair #SupportLocal', 'public', 1, 0, '2026-06-23 13:03:05', '2026-06-23 13:03:05');
INSERT INTO `feed_posts` VALUES ('f1a0385b-1b0d-4ee0-b7b9-e206a1b56eb1', 'admin-jmaeacido', '🎉 A small milestone for KAILA!\n\nWe\'re happy to welcome *Ryan*, our first Aircon and Refrigeration Service Provider on KAILA.\n\nThank you, @Ryan D. Patentis , for believing in our vision of connecting customers with trusted local service providers.\n\n\n❄️ Looking for reliable aircon or refrigeration services in Butuan City? Comment below or send us a message.\nHere\'s to building a stronger service community together! 💙\n\n#KAILA #LocalServices #ButuanCity #AirconServices #RefrigerationServices', 'public', 1, 0, '2026-06-23 12:01:06', '2026-06-23 12:42:29');

-- ----------------------------
-- Table structure for job_message_attachments
-- ----------------------------
DROP TABLE IF EXISTS `job_message_attachments`;
CREATE TABLE `job_message_attachments`  (
  `id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `message_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `original_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `mime_type` varchar(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `size_bytes` int NOT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `job_message_attachments_message_fk`(`message_id` ASC) USING BTREE,
  CONSTRAINT `job_message_attachments_message_fk` FOREIGN KEY (`message_id`) REFERENCES `job_messages` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of job_message_attachments
-- ----------------------------

-- ----------------------------
-- Table structure for job_message_reactions
-- ----------------------------
DROP TABLE IF EXISTS `job_message_reactions`;
CREATE TABLE `job_message_reactions`  (
  `message_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `reaction` varchar(40) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`message_id`, `user_id`, `reaction`) USING BTREE,
  INDEX `job_message_reactions_user_fk`(`user_id` ASC) USING BTREE,
  CONSTRAINT `job_message_reactions_message_fk` FOREIGN KEY (`message_id`) REFERENCES `job_messages` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `job_message_reactions_user_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of job_message_reactions
-- ----------------------------

-- ----------------------------
-- Table structure for job_messages
-- ----------------------------
DROP TABLE IF EXISTS `job_messages`;
CREATE TABLE `job_messages`  (
  `id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `request_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `sender_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `sender_name` varchar(160) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `detail` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL,
  `kind` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'text',
  `call_metadata` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `job_messages_request_fk`(`request_id` ASC) USING BTREE,
  INDEX `job_messages_sender_fk`(`sender_id` ASC) USING BTREE,
  CONSTRAINT `job_messages_request_fk` FOREIGN KEY (`request_id`) REFERENCES `requests` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `job_messages_sender_fk` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of job_messages
-- ----------------------------
INSERT INTO `job_messages` VALUES ('6bb1bfee-523e-4baf-afa1-c0e6c35f2846', '98b64520-adfd-4ff3-b7dc-b3cf11e55238', 'cf62db93-c4fe-442f-8428-0055dcac38a4', 'Provider 1', 'enc:v1:QSTNtKsGFlMhEdoI:9MK9QCqHAGJU5ojAurZkxQ==:WKKd', '2026-06-15 23:44:06', 'text', NULL);
INSERT INTO `job_messages` VALUES ('923c04c7-2a0c-40bf-9a82-23fbb2ece39c', '98b64520-adfd-4ff3-b7dc-b3cf11e55238', 'aa8d8d90-7e9a-4cb9-9c84-a0bad36a3327', 'John Mark Agustin Acido', 'enc:v1:MIDjta5B+GejTTcC:+3BzqfkSrlCU+RG8fbe8DQ==:RiTV', '2026-06-15 23:44:25', 'text', NULL);

-- ----------------------------
-- Table structure for job_navigation_states
-- ----------------------------
DROP TABLE IF EXISTS `job_navigation_states`;
CREATE TABLE `job_navigation_states`  (
  `request_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `provider_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('waiting','on_the_way','nearby','arrived','paused','stopped') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'waiting',
  `arrival_state` enum('waiting','on_the_way','nearby','arrived','paused','stopped') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'waiting',
  `provider_lat` decimal(10, 7) NULL DEFAULT NULL,
  `provider_lng` decimal(10, 7) NULL DEFAULT NULL,
  `accuracy_meters` decimal(8, 2) NULL DEFAULT NULL,
  `heading` decimal(8, 2) NULL DEFAULT NULL,
  `speed_mps` decimal(8, 2) NULL DEFAULT NULL,
  `distance_meters` int NULL DEFAULT NULL,
  `eta_minutes` int NULL DEFAULT NULL,
  `started_at` datetime NULL DEFAULT NULL,
  `nearby_at` datetime NULL DEFAULT NULL,
  `arrived_at` datetime NULL DEFAULT NULL,
  `stopped_at` datetime NULL DEFAULT NULL,
  `last_location_at` datetime NULL DEFAULT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`request_id`) USING BTREE,
  INDEX `job_navigation_provider_idx`(`provider_id` ASC, `status` ASC) USING BTREE,
  CONSTRAINT `job_navigation_provider_fk` FOREIGN KEY (`provider_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `job_navigation_request_fk` FOREIGN KEY (`request_id`) REFERENCES `requests` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of job_navigation_states
-- ----------------------------
INSERT INTO `job_navigation_states` VALUES ('98b64520-adfd-4ff3-b7dc-b3cf11e55238', 'cf62db93-c4fe-442f-8428-0055dcac38a4', 'stopped', 'stopped', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-06-15 23:45:14', NULL, '2026-06-15 23:45:14');

-- ----------------------------
-- Table structure for message_read_states
-- ----------------------------
DROP TABLE IF EXISTS `message_read_states`;
CREATE TABLE `message_read_states`  (
  `user_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `scope` enum('job','direct') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `thread_id` varchar(160) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `read_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`user_id`, `scope`, `thread_id`) USING BTREE,
  INDEX `message_read_states_thread_idx`(`scope` ASC, `thread_id` ASC) USING BTREE,
  CONSTRAINT `message_read_states_user_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of message_read_states
-- ----------------------------
INSERT INTO `message_read_states` VALUES ('aa8d8d90-7e9a-4cb9-9c84-a0bad36a3327', 'job', '98b64520-adfd-4ff3-b7dc-b3cf11e55238', '2026-06-15 23:44:25', '2026-07-01 10:32:20');
INSERT INTO `message_read_states` VALUES ('cf62db93-c4fe-442f-8428-0055dcac38a4', 'job', '98b64520-adfd-4ff3-b7dc-b3cf11e55238', '2026-06-15 23:44:25', '2026-06-15 15:47:14');

-- ----------------------------
-- Table structure for missed_calls
-- ----------------------------
DROP TABLE IF EXISTS `missed_calls`;
CREATE TABLE `missed_calls`  (
  `id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `caller_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `caller_name` varchar(160) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `recipient_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `request_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `direct_user_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `call_type` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `context_title` varchar(180) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `missed_calls_recipient_idx`(`recipient_id` ASC, `created_at` ASC) USING BTREE,
  INDEX `missed_calls_caller_fk`(`caller_id` ASC) USING BTREE,
  CONSTRAINT `missed_calls_caller_fk` FOREIGN KEY (`caller_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `missed_calls_recipient_fk` FOREIGN KEY (`recipient_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of missed_calls
-- ----------------------------

-- ----------------------------
-- Table structure for moderation_reports
-- ----------------------------
DROP TABLE IF EXISTS `moderation_reports`;
CREATE TABLE `moderation_reports`  (
  `id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `reporter_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `reported_user_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `request_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `type` enum('user','job') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `reason` varchar(160) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `details` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `status` varchar(40) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Open',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `moderation_reports_status_idx`(`status` ASC, `created_at` ASC) USING BTREE,
  INDEX `moderation_reports_reporter_idx`(`reporter_id` ASC, `created_at` ASC) USING BTREE,
  INDEX `moderation_reports_user_fk`(`reported_user_id` ASC) USING BTREE,
  INDEX `moderation_reports_request_fk`(`request_id` ASC) USING BTREE,
  CONSTRAINT `moderation_reports_reporter_fk` FOREIGN KEY (`reporter_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `moderation_reports_request_fk` FOREIGN KEY (`request_id`) REFERENCES `requests` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT,
  CONSTRAINT `moderation_reports_user_fk` FOREIGN KEY (`reported_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of moderation_reports
-- ----------------------------
INSERT INTO `moderation_reports` VALUES ('b51e8732-dcba-42f4-8933-75d3c19cc772', 'admin-jmaeacido', NULL, '2efedbf8-ae2f-43cc-9799-5d1735bed1c0', 'job', 'Other', 'Test Report.', 'Closed', '2026-06-14 16:14:26', '2026-06-15 23:35:38');

-- ----------------------------
-- Table structure for notification_read_states
-- ----------------------------
DROP TABLE IF EXISTS `notification_read_states`;
CREATE TABLE `notification_read_states`  (
  `user_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` varchar(40) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `read_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`user_id`, `type`) USING BTREE,
  CONSTRAINT `notification_read_states_user_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of notification_read_states
-- ----------------------------
INSERT INTO `notification_read_states` VALUES ('aa8d8d90-7e9a-4cb9-9c84-a0bad36a3327', 'activity', '2026-06-14 16:14:26', '2026-06-14 08:56:03');
INSERT INTO `notification_read_states` VALUES ('aa8d8d90-7e9a-4cb9-9c84-a0bad36a3327', 'feed', '2026-06-14 16:30:36', '2026-06-14 08:56:03');
INSERT INTO `notification_read_states` VALUES ('admin-jmaeacido', 'activity', '2026-06-23 13:57:58', '2026-06-23 05:58:23');
INSERT INTO `notification_read_states` VALUES ('admin-jmaeacido', 'feed', '2026-06-18 02:35:19', '2026-06-18 00:18:29');

-- ----------------------------
-- Table structure for offers
-- ----------------------------
DROP TABLE IF EXISTS `offers`;
CREATE TABLE `offers`  (
  `id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `request_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` enum('offer','counter') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `provider_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `provider_name` varchar(160) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` varchar(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `schedule` varchar(160) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `created_at` datetime NOT NULL,
  `provider_lat` decimal(10, 7) NULL DEFAULT NULL,
  `provider_lng` decimal(10, 7) NULL DEFAULT NULL,
  `provider_location_captured_at` datetime NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `offers_request_fk`(`request_id` ASC) USING BTREE,
  INDEX `offers_provider_fk`(`provider_id` ASC) USING BTREE,
  CONSTRAINT `offers_provider_fk` FOREIGN KEY (`provider_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `offers_request_fk` FOREIGN KEY (`request_id`) REFERENCES `requests` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of offers
-- ----------------------------
INSERT INTO `offers` VALUES ('d7eec381-c9a5-481e-b6a4-8d96678db59e', '98b64520-adfd-4ff3-b7dc-b3cf11e55238', 'offer', 'cf62db93-c4fe-442f-8428-0055dcac38a4', 'Provider 1', '1500.00', 'Today', '', '2026-06-15 23:42:56', 8.9839426, 125.3440895, '2026-06-15 23:42:56');

-- ----------------------------
-- Table structure for providers
-- ----------------------------
DROP TABLE IF EXISTS `providers`;
CREATE TABLE `providers`  (
  `id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(160) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `area` varchar(190) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `availability` varchar(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Available',
  `skills` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `display_name` varchar(160) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `provider_type` varchar(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `specific_services` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `years_experience` varchar(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `coverage_area` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `emergency_availability` varchar(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `available_days` varchar(160) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `available_time` varchar(160) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `travel_limits` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `minimum_fee` varchar(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `price_range` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `work_samples` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `certificate_proof` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `valid_id_consent` tinyint(1) NOT NULL DEFAULT 0,
  `consent_requests` tinyint(1) NOT NULL DEFAULT 0,
  `consent_ratings` tinyint(1) NOT NULL DEFAULT 0,
  `rules_agreement` tinyint(1) NOT NULL DEFAULT 0,
  `trust_level` varchar(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Listed',
  `status` varchar(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Active',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `providers_user_unique`(`user_id` ASC) USING BTREE,
  CONSTRAINT `providers_user_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of providers
-- ----------------------------
INSERT INTO `providers` VALUES ('903f0d82-ffb9-48c3-a008-4301363a72ff', 'aa8d8d90-7e9a-4cb9-9c84-a0bad36a3327', 'John Mark Agustin Acido', 'Plumbing, Electrical, Computer repair, Graphic / digital services, General odd jobs', 'Purok 2, Barangay 20, City of Gingoog, Misamis Oriental', 'Weekends', 'N/A', '2026-06-14 15:18:18', '2026-06-23 02:03:21', 'John Mark Agustin Acido', 'Individual', 'N/A', '6-10', 'Agay-ayan, Alagatan, Anakan, Bagubad, Bakidbakid, Bal-ason, Bantaawan, Barangay 1, Barangay 2, Barangay 3, Barangay 4, Barangay 5, Barangay 6, Barangay 7, Barangay 8, Barangay 9, Barangay 10, Barangay 11, Barangay 12, Barangay 13, Barangay 14, Barangay 15, Barangay 16, Barangay 17, Barangay 18, Barangay 18-A, Barangay 19, Barangay 20, Barangay 21, Barangay 22, Barangay 22-A, Barangay 23, Barangay 24, Barangay 24-A, Barangay 25, Barangay 26, Binakalan, Capitulangan, Daan-Lungsod, Dinawehan, Eureka, Hindangon, Kalagonoy, Kalipay, Kamanikan, Kianlagan, Kibuging, Kipuntos, Lawaan, Lawit, Libertad, Libon, Lunao, Lunotan, Malibud, Malinao, Maribucao, Mimbalagon, Mimbunga, Mimbuntong, Minsapinit, Murallon, Odiongan, Pangasihan, Pigsaluhan, Punong, Ricoro, Samay, San Jose, San Juan, San Luis, San Miguel, Sangalan, Santiago, Tagpako, Talisay, Talon, Tinabalan, Tinulongan', 'Sometimes', 'Saturday, Sunday', '08:00 - 17:00', 'Gingoog City', '300.00', '300.00 - 5000.00', '', '', 0, 1, 1, 1, 'Listed', 'Active');
INSERT INTO `providers` VALUES ('def5bccb-00fa-4418-bda2-f5d4ec4c1dc4', 'cf62db93-c4fe-442f-8428-0055dcac38a4', 'Handy Man', 'Appliance repair, Plumbing, Electrical, Computer repair, Cellphone repair, Mechanical / motorcycle, Carpentry / home maintenance, Cleaning, AirCon Cleaning, Beauty, makeup, and events, Graphic / digital services, General odd jobs', 'Purok 2, Barangay 20, City of Gingoog, Misamis Oriental', 'Monday, Tuesday, Wednesday, Thursday, Friday', 'N/A', '2026-06-15 23:42:14', '2026-06-23 13:57:58', 'Handy Man', 'Individual', 'N/A', '10+', 'Agay-ayan, Alagatan, Anakan, Bagubad, Bakidbakid, Bal-ason, Bantaawan, Barangay 1, Barangay 2, Barangay 3, Barangay 4, Barangay 5, Barangay 6, Barangay 7, Barangay 8, Barangay 9, Barangay 10, Barangay 11, Barangay 12, Barangay 13, Barangay 14, Barangay 15, Barangay 16, Barangay 17, Barangay 18, Barangay 18-A, Barangay 19, Barangay 20, Barangay 21, Barangay 22, Barangay 22-A, Barangay 23, Barangay 24, Barangay 24-A, Barangay 25, Barangay 26, Binakalan, Capitulangan, Daan-Lungsod, Dinawehan, Eureka, Hindangon, Kalagonoy, Kalipay, Kamanikan, Kianlagan, Kibuging, Kipuntos, Lawaan, Lawit, Libertad, Libon, Lunao, Lunotan, Malibud, Malinao, Maribucao, Mimbalagon, Mimbunga, Mimbuntong, Minsapinit, Murallon, Odiongan, Pangasihan, Pigsaluhan, Punong, Ricoro, Samay, San Jose, San Juan, San Luis, San Miguel, Sangalan, Santiago, Tagpako, Talisay, Talon, Tinabalan, Tinulongan', 'Sometimes', 'Monday, Tuesday, Wednesday, Thursday, Friday', '08:00 - 17:00', 'None', '300.00', '300.00 - 10000.00', '', '', 1, 1, 1, 1, 'Listed', 'Deleted');
INSERT INTO `providers` VALUES ('e0515324-08bd-4151-b993-ea320fe74493', '88efec24-d222-4497-82b8-96309d688f1a', 'Ryan D. Patentis', 'AirCon Cleaning', '023, Purok Maabi-abihon, Agusan Pequeño, City of Butuan, Independent City', 'Saturday, Sunday', 'Aircon and refregeration services', '2026-06-22 21:16:49', '2026-06-23 02:03:21', 'Ryan D. Patentis', 'Freelancer', 'Aircon and refregeration services', '10+', 'Agao Pob., Agusan Pequeño, Ambago, Amparo, Ampayon, Anticala, Antongalon, Aupagan, Baan KM 3, Baan Riverside Pob., Babag, Bading Pob., Bancasi, Banza, Baobaoan, Basag, Bayanihan Pob., Bilay, Bit-os, Bitan-agan, Bobon, Bonbon, Bugabus, Bugsukan, Buhangin Pob., Cabcabon, Camayahan, Dagohoy Pob., Dankias, De Oro, Diego Silang Pob., Don Francisco, Doongan, Dulag, Dumalagan, Florida, Golden Ribbon Pob., Holy Redeemer Pob., Humabon Pob., Imadejas Pob., Jose Rizal Pob., Kinamlutan, Lapu-lapu Pob., Lemon, Leon Kilat Pob., Libertad, Limaha Pob., Los Angeles, Lumbocan, Maguinda, Mahay, Mahogany Pob., Maibu, Mandamo, Manila de Bugabus, Maon Pob., Masao, Maug, New Society Village Pob., Nong-nong, Obrero Pob., Ong Yiu Pob., Pagatpatan, Pangabugan, Pianing, Pigdaulan, Pinamanculan, Port Poyohon Pob., Rajah Soliman Pob., Salvacion, San Ignacio Pob., San Mateo, San Vicente, Santo Niño, Sikatuna Pob., Silongan Pob., Sumile, Sumilihon, Tagabaca, Taguibo, Taligaman, Tandang Sora Pob., Tiniwisan, Tungao, Urduja Pob., Villa Kananga', 'Yes', 'Saturday, Sunday', '', 'All area of caraga', '500.00', '2500.00 - 5000.00', '', '', 1, 1, 1, 1, 'Listed', 'Active');

-- ----------------------------
-- Table structure for push_tokens
-- ----------------------------
DROP TABLE IF EXISTS `push_tokens`;
CREATE TABLE `push_tokens`  (
  `id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `token` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `token_hash` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `platform` varchar(40) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'android',
  `device_id` varchar(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `token_hash`(`token_hash` ASC) USING BTREE,
  UNIQUE INDEX `push_tokens_hash_unique`(`token_hash` ASC) USING BTREE,
  INDEX `push_tokens_user_fk`(`user_id` ASC) USING BTREE,
  CONSTRAINT `push_tokens_user_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of push_tokens
-- ----------------------------
INSERT INTO `push_tokens` VALUES ('cd0ac07e-f3ed-4271-ac88-6c9b76e6ec20', '2b76936c-ddcb-4328-ba3c-1c491519423c', 'eqqTiLljSvKuLw7wCVP5pH:APA91bFjuBnrNkTTu5_OM3CmDJmMjJzSDnC3UF0JItETnLRga_GXWLgu_QRe19ETwAOiOxvn31rvDQT3A-rIy3l7eBEXneu4F2vcWbsihuAQyCKyY3mudlg', 'fc62788b8b062a33ef99bbb33f2581c51a82407c7995917e5ad45581c408a520', 'android', '4bce3288-9ea3-4c1f-bfbb-dcd2593ebc46', '2026-06-07 14:01:05', '2026-06-08 08:15:29');
INSERT INTO `push_tokens` VALUES ('fec02bb6-cedb-4bba-9cb1-0e4925209377', 'admin-jmaeacido', 'e2f8x3fDRhuoWKZhyyFrlE:APA91bG2UsruENTUVSNeZDr-YkYLWMxJ4SKPC57OrP15tEFKEEK2Kl4lkLAxMDnJSgQIpUKpgow0XHLLa_eS8Xo0EY7AuB77Oa4-C1nZ8SwNtM1ZvLMjTHU', 'b4343ea1a38955d1b18e449a1d8f7f52dbad6249ed05804617716fe5cad9e12a', 'android', 'f614c16e-6a27-4904-b91d-156be6077f27', '2026-06-12 11:11:31', '2026-07-11 15:19:41');

-- ----------------------------
-- Table structure for request_attachments
-- ----------------------------
DROP TABLE IF EXISTS `request_attachments`;
CREATE TABLE `request_attachments`  (
  `id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `request_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `stage` enum('request','completion','dispute') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `original_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `mime_type` varchar(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `size_bytes` int NOT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `request_attachments_request_fk`(`request_id` ASC) USING BTREE,
  CONSTRAINT `request_attachments_request_fk` FOREIGN KEY (`request_id`) REFERENCES `requests` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of request_attachments
-- ----------------------------

-- ----------------------------
-- Table structure for request_passes
-- ----------------------------
DROP TABLE IF EXISTS `request_passes`;
CREATE TABLE `request_passes`  (
  `request_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `provider_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`request_id`, `provider_id`) USING BTREE,
  INDEX `request_passes_provider_fk`(`provider_id` ASC) USING BTREE,
  CONSTRAINT `request_passes_provider_fk` FOREIGN KEY (`provider_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `request_passes_request_fk` FOREIGN KEY (`request_id`) REFERENCES `requests` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of request_passes
-- ----------------------------

-- ----------------------------
-- Table structure for requests
-- ----------------------------
DROP TABLE IF EXISTS `requests`;
CREATE TABLE `requests`  (
  `id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `client_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `client_name` varchar(160) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` varchar(160) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `urgency` varchar(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `area` varchar(190) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `budget` varchar(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `details` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `confirmed_at` datetime NULL DEFAULT NULL,
  `rating_score` tinyint NULL DEFAULT NULL,
  `rating_note` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `dispute_note` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `provider_done_at` datetime NULL DEFAULT NULL,
  `auto_confirm_at` datetime NULL DEFAULT NULL,
  `proof_note` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `revision_note` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `payment_released_at` datetime NULL DEFAULT NULL,
  `rating_deadline_at` datetime NULL DEFAULT NULL,
  `client_rating_score` tinyint NULL DEFAULT NULL,
  `client_rating_note` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `client_rated_at` datetime NULL DEFAULT NULL,
  `provider_rating_score` tinyint NULL DEFAULT NULL,
  `provider_rating_note` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `provider_rated_at` datetime NULL DEFAULT NULL,
  `accepted_provider_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `preferred_schedule` varchar(160) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `contact_method` varchar(160) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `exact_location_notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `permission_to_forward` tinyint(1) NOT NULL DEFAULT 0,
  `consent_to_rate` tinyint(1) NOT NULL DEFAULT 0,
  `job_lat` decimal(10, 7) NULL DEFAULT NULL,
  `job_lng` decimal(10, 7) NULL DEFAULT NULL,
  `job_location_source` varchar(40) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `requests_client_fk`(`client_id` ASC) USING BTREE,
  CONSTRAINT `requests_client_fk` FOREIGN KEY (`client_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of requests
-- ----------------------------
INSERT INTO `requests` VALUES ('2efedbf8-ae2f-43cc-9799-5d1735bed1c0', 'aa8d8d90-7e9a-4cb9-9c84-a0bad36a3327', 'John Mark Agustin Acido', 'Appliance repair', 'Today', 'Purok 2, Barangay 20, City of Gingoog, Misamis Oriental', '500.00', 'Wall fan is not powering up.', 'Cancelled', '2026-06-14 15:20:36', '2026-06-14 15:34:23', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '', 'Call', '', 1, 1, 8.8109165, 125.1206274, 'current');
INSERT INTO `requests` VALUES ('98b64520-adfd-4ff3-b7dc-b3cf11e55238', 'aa8d8d90-7e9a-4cb9-9c84-a0bad36a3327', 'John Mark Agustin Acido', 'Appliance repair', 'Today', 'Purok 2, Barangay 20, City of Gingoog, Misamis Oriental', 'Open', 'Broken wall fan.', 'Rated / Closed', '2026-06-15 23:29:02', '2026-06-15 23:45:14', '2026-06-15 23:44:46', NULL, NULL, NULL, '2026-06-15 23:44:32', '2026-06-17 23:44:32', '', NULL, '2026-06-15 23:44:46', '2026-06-22 23:44:46', 5, 'Good', '2026-06-15 23:45:00', 5, 'Nice!', '2026-06-15 23:45:14', 'cf62db93-c4fe-442f-8428-0055dcac38a4', '', 'Call', '', 1, 1, 8.8112821, 125.1207292, 'map');

-- ----------------------------
-- Table structure for user_blocks
-- ----------------------------
DROP TABLE IF EXISTS `user_blocks`;
CREATE TABLE `user_blocks`  (
  `blocker_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `blocked_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `reason` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`blocker_id`, `blocked_id`) USING BTREE,
  INDEX `user_blocks_blocked_idx`(`blocked_id` ASC) USING BTREE,
  CONSTRAINT `user_blocks_blocked_fk` FOREIGN KEY (`blocked_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `user_blocks_blocker_fk` FOREIGN KEY (`blocker_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of user_blocks
-- ----------------------------

-- ----------------------------
-- Table structure for users
-- ----------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users`  (
  `id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(160) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(190) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `password_hash` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('client','provider','admin','ops','customer_service') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `area` varchar(190) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `username` varchar(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `photo_file` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `photo_mime_type` varchar(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `contact_number` varchar(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `messenger_link` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `preferred_contact_channel` varchar(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `best_contact_time` varchar(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `data_privacy_consent` tinyint(1) NOT NULL DEFAULT 0,
  `deleted_at` datetime NULL DEFAULT NULL,
  `auth_provider` varchar(40) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `auth_subject` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `social_photo_url` varchar(1024) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `account_status` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `status_updated_at` datetime NULL DEFAULT NULL,
  `banned_at` datetime NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `users_username_unique`(`username` ASC) USING BTREE,
  UNIQUE INDEX `email`(`email` ASC) USING BTREE,
  UNIQUE INDEX `users_auth_subject_unique`(`auth_subject` ASC) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of users
-- ----------------------------
INSERT INTO `users` VALUES ('2b76936c-ddcb-4328-ba3c-1c491519423c', 'John Mark Agustin Acido', NULL, '84488372730e33f909c1809fe103d2d4:3102b683459b3914ac4858ac3ee7686fd42a69fe69cef4e7ecac471ce072c211', 'ops', 'Operations', '', '2026-06-03 21:51:17', 'jm-ops', NULL, NULL, '09973855508', '', 'Messenger', 'Business hours', 1, NULL, NULL, NULL, NULL, 'active', NULL, NULL);
INSERT INTO `users` VALUES ('4dbe558b-6b18-4fa2-a147-754ee757c58e', 'DWIGHT T. JANOPOL', 'dtjanopol@gmail.com', 'c15bcdc80bffab63b4dc0f47bd2d61c7:fa40aff97c6bdd7029ea61402eba1a766a8a5af24117344d9d270ab4ab03b202', 'admin', 'KAILA Administration', '', '2026-06-23 10:47:20', 'dwight', NULL, NULL, '09562280995', '', 'Messenger', 'Any time', 1, NULL, NULL, NULL, NULL, 'active', NULL, NULL);
INSERT INTO `users` VALUES ('53c665b1-0d69-4756-9202-9840884d499d', 'Andy Amporias', 'andygamporias@gmail.com', 'f477605ae184fabada493aa766bf6e19:c02ac89836dae58755cb08b0b8d97c05f6728088d50edd5e0a198b7b9a5837af', 'client', 'Ambago, City of Butuan, Independent City', '', '2026-06-23 13:09:10', 'andygamporias', NULL, NULL, '09174419428', '', 'Messenger', '', 0, NULL, 'google', 'google:101200010622583136097', 'https://lh3.googleusercontent.com/a/ACg8ocJvj2xcEgw43On1qrWLvuxrxZmkqhpuYxR3wOiesAj3zkniVBw=s96-c', 'active', NULL, NULL);
INSERT INTO `users` VALUES ('57ff5b56-6df9-43fd-981e-7a693c8f95b7', 'KAILA Customer Service', NULL, '2dc1ecbeed704f7c686a6cdb660bffce:2813fbd0cbfe928c475d48bd8aa5531524d2a51878a3077c0c75114ee4ed38bb', 'customer_service', 'Purok 2, Barangay 20, City of Gingoog, Misamis Oriental', '', '2026-06-04 15:08:35', 'kaila_cs_1', NULL, NULL, '', '', 'Messenger', '', 1, NULL, NULL, NULL, NULL, 'active', NULL, NULL);
INSERT INTO `users` VALUES ('5c9e7ece-149a-4bbf-bf8a-28f06080f50d', 'John Mark Agustin Acido', '94jmaea94@gmail.com', '865df5888e526dc92b756bdb47170378:be810ee42d8df4084a56a1981d95125b0b4da7e33b6a91db0cadeb71a07a99b9', 'client', 'Profile pending', '', '2026-06-14 08:41:21', '94jmaea94', NULL, NULL, '', '', '', '', 0, NULL, 'google', 'google:106939451418811423210', 'https://lh3.googleusercontent.com/a/ACg8ocJEkO4BMXm7k2dGUL2zi3HIvAWPhd8-r7JN2mnUpIHxtqVvvtadgA=s96-c', 'active', NULL, NULL);
INSERT INTO `users` VALUES ('5e0774f2-0f13-485c-9462-82d970d5aad5', 'Azis Dida-agun (teo)', 'pgteo96@gmail.com', 'd61365691f15cf1f79a51771bd422ba8:5b727e5e89492caf6e3fa52c63b4eb3e19de3c9bd050ee553af718d80774dc12', 'client', 'Profile pending', '', '2026-06-23 07:08:51', 'pgteo96', NULL, NULL, '', '', '', '', 0, NULL, 'google', 'google:100002602792593634071', 'https://lh3.googleusercontent.com/a/ACg8ocKOzws9ANvR_ntw6kIECqwAP0G4F-kupl9Z4GbbDfLp5CvHgD0J=s96-c', 'active', NULL, NULL);
INSERT INTO `users` VALUES ('88efec24-d222-4497-82b8-96309d688f1a', 'Ryan D. Patentis', 'ryanpatentis99@gmail.com', '493b72f5936eb32b6ad5210b3a310793:f3f6823578c9145eabdc8e07657fbdacd779b6a952805223c244eed57c9aa2b5', 'provider', '023, Purok Maabi-abihon, Agusan Pequeño, City of Butuan, Independent City', 'AirCon Cleaning', '2026-06-22 21:16:49', 'ryanpugi', NULL, NULL, '09916486627', '', 'Messenger', 'Any time', 1, NULL, NULL, NULL, NULL, 'active', NULL, NULL);
INSERT INTO `users` VALUES ('8b0cf692-ecd0-40c8-a844-58b7f4aaab24', 'David Libradelia Salvador', 'dlsalvador0131@gmail.com', '3790ed4f85698ed521915c42e0373129:cbf18d46c3862869f1cf768c9652a3d642e8d822580a34ec861dfc957cc5b658', 'admin', 'KAILA Administration', '', '2026-06-23 10:38:12', 'dlsalvador', NULL, NULL, '09632572856', '', 'Messenger', 'Any time', 1, NULL, NULL, NULL, NULL, 'active', NULL, NULL);
INSERT INTO `users` VALUES ('aa8d8d90-7e9a-4cb9-9c84-a0bad36a3327', 'John Mark Agustin Acido', 'jacido23@yahoo.com', 'b222f22ac8c0797b2a6535a22a64b9a7:8f4b75512da17361ddeb7c423174e168bb57884400a3e87bb387a19ac55bc53a', 'client', 'Purok 2, Barangay 20, City of Gingoog, Misamis Oriental', '', '2026-06-14 09:47:17', 'jacido23', NULL, NULL, '+639973855508', '@JohnMarkAgustinEstrososAcido', 'Call', 'Business hours', 1, NULL, 'facebook', 'facebook:27562584473428850', 'https://platform-lookaside.fbsbx.com/platform/profilepic/?asid=27562584473428850&height=200&width=200&ext=1783993637&hash=AfvYwbHEAwTRrQdmudq0x-VN', 'active', NULL, NULL);
INSERT INTO `users` VALUES ('admin-jmaeacido', 'KAILA Admin', NULL, 'ce7623abe33e02773172b30bb1d67cc9:4dde1376f73a641cf536ec09d34e0627f01f0d1d460842ffa6e604573bc4dcf2', 'admin', 'Operations', '', '2026-06-03 09:21:50', 'jmaeacido', 'admin-jmaeacido-mqgcq0ob-c00d1ac6.jpg', 'image/jpeg', '+639973855508', '', 'Messenger', 'Business hours', 0, NULL, NULL, NULL, NULL, 'active', '2026-06-23 02:33:05', NULL);
INSERT INTO `users` VALUES ('cf62db93-c4fe-442f-8428-0055dcac38a4', 'Deleted provider', NULL, 'f1bb7059d211a30ad6b709d99d2f51e3:e7a81fb02e62854cba2ab4e3b4166cec1f4fd0d8c894a51be11f0943e408f189', 'provider', 'Deleted account', NULL, '2026-06-15 23:42:14', 'deleted_cf62db93-c4fe-44', NULL, NULL, NULL, NULL, NULL, NULL, 0, '2026-06-23 13:57:58', NULL, NULL, NULL, 'deleted', '2026-06-23 13:57:58', NULL);
INSERT INTO `users` VALUES ('d012043b-da2d-4e38-8dd2-cd1d44fcd457', 'Deleted client', NULL, '36a2be8516d64d2f64414be600b9d205:fd0f135dd69df08cdc2a4886b0aa9c3f24664eb4d771c395e4498a78ec357f9f', 'client', 'Deleted account', NULL, '2026-06-15 23:07:31', 'deleted_d012043b-da2d-4e', NULL, NULL, NULL, NULL, NULL, NULL, 0, '2026-06-15 23:28:35', NULL, NULL, NULL, 'active', NULL, NULL);
INSERT INTO `users` VALUES ('ddf1e21a-0587-40c0-8a9f-83ed1be208d2', 'MIKE BUZON', 'mikkzz6@gmail.com', 'f887b9d03219d52b8fb4928e54190a3c:783a6c1666e3488a331dbdfee58e067f224ad44a2bbc8d6ec69ea5daa0b9d618', 'admin', 'KAILA Administration', '', '2026-06-23 11:08:55', 'mksbuzon', NULL, NULL, '09055655350', '', 'Messenger', 'Business hours', 1, NULL, NULL, NULL, NULL, 'active', NULL, NULL);
INSERT INTO `users` VALUES ('user_mpy4523h_9294ab61', 'KAILA Admin', NULL, 'd9a1f7cdcf9ea9260def4cc84b995c7e:df43066d09a4390fba67d691f22f73c2e8df4e1c2ba58f5709b584b235a302c1', 'admin', 'Operations', '', '2026-06-03 13:39:32', 'admin', NULL, NULL, 'admin', '', 'Internal', '', 1, NULL, NULL, NULL, NULL, 'active', NULL, NULL);

-- ----------------------------
-- Table structure for validation_entries
-- ----------------------------
DROP TABLE IF EXISTS `validation_entries`;
CREATE TABLE `validation_entries`  (
  `id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` enum('client_survey','provider_interview') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `operator_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `operator_name` varchar(160) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `subject_name` varchar(160) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `area` varchar(190) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `category` varchar(160) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `decision_signal` varchar(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `responses` json NOT NULL,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `validation_entries_type_idx`(`type` ASC) USING BTREE,
  INDEX `validation_entries_created_idx`(`created_at` ASC) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of validation_entries
-- ----------------------------

SET FOREIGN_KEY_CHECKS = 1;
