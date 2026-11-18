import type {VKIconName} from '@/vkgram/components/VKIcons';

import appwiz1500 from './appwiz_1500.ico?url';
import arrowLeft from './arrow_left.ico?url';
import arrowRight from './arrow_right.ico?url';
import bookmark from './bookmark.ico?url';
import camera from './camera.ico?url';
import cdMusic from './cd_music.ico?url';
import copy from './copy.ico?url';
import deleteIcon from './delete.ico?url';
import earth from './earth.ico?url';
import fileFind from './file_find.ico?url';
import filePen from './file_pen.ico?url';
import filePin from './file_pin.ico?url';
import files from './files.ico?url';
import folderShared from './folder_shared.ico?url';
import forbidden from './forbidden.ico?url';
import fullscrn from './fullscrn.ico?url';
import lock from './lock.ico?url';
import mail from './mail.ico?url';
import mailnews20 from './mailnews_20.ico?url';
import mediaVideo from './media_video.ico?url';
import mute from './mute.ico?url';
import network2 from './network_2.ico?url';
import new16 from './new16.ico?url';
import playd16 from './playd16.ico?url';
import powerOff from './power_off.ico?url';
import quikview1 from './quikview_1.ico?url';
import recycleEmpty from './recycle_empty.ico?url';
import settings from './settings.ico?url';
import sndvol32302 from './sndvol32_302.ico?url';
import star from './star.ico?url';
import time from './time.ico?url';
import url102 from './url_102.ico?url';
import user from './user.ico?url';
import wab321019 from './wab32_1019.ico?url';

/**
 * Windows 95/98 icon resources for the `serverhub` skin, keyed by `VKIconName`.
 * Only the names with a real Win9x counterpart live here: everything else keeps
 * VKgram's line glyph. The files come from `@react95/icons` (MIT) — see
 * NOTICE.md — and are used unmodified.
 */
export const ICONS_9X: Partial<Record<VKIconName, string>> = {
  profile: user,
  news: mailnews20,
  messages: mail,
  telegram: earth,
  friends: wab321019,
  groups: folderShared,
  channels: network2,
  audio: cdMusic,
  photos: camera,
  videos: mediaVideo,
  docs: files,
  apps: appwiz1500,
  settings: settings,
  search: fileFind,
  close: deleteIcon,
  back: arrowLeft,
  logout: powerOff,
  play: playd16,
  volume: sndvol32302,
  mute: mute,
  fullscreen: fullscrn,
  trash: recycleEmpty,
  copy: copy,
  pin: filePin,
  bookmark: bookmark,
  edit: filePen,
  link: url102,
  eye: quikview1,
  'eye-off': forbidden,
  plus: new16,
  clock: time,
  chevron: arrowRight,
  lock: lock,
  star: star
};
