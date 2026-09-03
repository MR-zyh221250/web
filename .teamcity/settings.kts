import jetbrains.buildServer.configs.kotlin.*
import jetbrains.buildServer.configs.kotlin.buildSteps.script
import jetbrains.buildServer.configs.kotlin.triggers.vcs
import jetbrains.buildServer.configs.kotlin.vcs.GitVcsRoot

version = "2026.2"

project {
    vcsRoot(WebSource)
    buildType(WebDeployment)
}

object WebSource : GitVcsRoot({
    id("HttpsGithubComMrZyh221250webGitRefsHeadsMain")
    name = "MR-zyh221250/web"
    url = "https://github.com/MR-zyh221250/web.git"
    branch = "refs/heads/main"
})

object WebDeployment : BuildType({
    id("Build")
    name = "Build and Deploy"
    enablePersonalBuilds = false
    description = "Build and deploy to the dedicated Docker agent on the website server."
    maxRunningBuilds = 1
    artifactRules = ".ci-output/*.txt"
    vcs {
        root(WebSource)
        branchFilter = "+:<default>"
    }
    steps {
        script {
            name = "Build image and HTTP smoke checks"
            id = "simpleRunner"
            scriptContent = "export NEON_BUILD_ID=%teamcity.build.id%\nsh ci/build.sh"
        }
        script {
            name = "Deploy and roll back on failure"
            id = "simpleRunner_1"
            scriptContent = "sh ci/deploy.sh"
        }
    }
    triggers { vcs { branchFilter = "+:<default>" } }
    requirements {
        equals("env.NEON_DEPLOY_TARGET", "neon-loft-production")
    }
})
