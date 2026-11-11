import avatar1 from "../assets/avatars/avatar-1.webp";
import avatar2 from "../assets/avatars/avatar-2.webp";
import avatar3 from "../assets/avatars/avatar-3.webp";
import avatar4 from "../assets/avatars/avatar-4.webp";
import avatar5 from "../assets/avatars/avatar-5.webp";
import avatar6 from "../assets/avatars/avatar-6.webp";
import avatar7 from "../assets/avatars/avatar-7.webp";
import avatar8 from "../assets/avatars/avatar-8.webp";
import avatar9 from "../assets/avatars/avatar-9.webp";

export const profileAvatars = [
  avatar1, avatar2, avatar3, avatar4, avatar5,
  avatar6, avatar7, avatar8, avatar9,
];

export function getProfileAvatar(avatarIndex) {
  const index = Number(avatarIndex);
  return Number.isInteger(index) && index >= 0 && index < profileAvatars.length
    ? profileAvatars[index]
    : profileAvatars[0];
}

export function shuffleProfileAvatar(userId) {
  const currentKey = `vesla-profile-avatar-${userId}`;
  try {
    const current = Number(window.localStorage.getItem(currentKey));
    const choices = profileAvatars
      .map((_, index) => index)
      .filter((index) => index !== current);
    const selected = choices[Math.floor(Math.random() * choices.length)];
    window.localStorage.setItem(currentKey, String(selected));
    return profileAvatars[selected];
  } catch {
    return profileAvatars[Math.floor(Math.random() * profileAvatars.length)];
  }
}
