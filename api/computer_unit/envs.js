function log() {
  console.info("ENV ==>", ...arguments);
}

function getEnvsFromSettings(settings) {
  log(settings);
  const envsNameFromSettingsMap = {
    "git-username": "GIT_AUTHOR_NAME",
    "git-email": "EMAIL",
    "github-auth-token": "GITHUB_TOKEN",
  };
  const envs = [];
  for (const [key, value] of Object.entries(settings)) {
    try {
      const envName = envsNameFromSettingsMap[key];
      envs.push(`${envName}=${value}`);
    } catch (error) {}
  }
  log(envs);
  envs.push(`GIT_CONFIG_COUNT=2`);
  envs.push(`GIT_CONFIG_KEY_0=credential.https://github.com.username`);
  envs.push(`GIT_CONFIG_VALUE_0=${settings["git-username"]}`);
  envs.push(`GIT_CONFIG_KEY_1=credential.https://github.com.helper`);
  envs.push(
    `GIT_CONFIG_VALUE_1=!f() { test "$1" = get && echo "password=$(echo $GITHUB_TOKEN)"; }; f`
  );

  return envs;
}

export { getEnvsFromSettings };
