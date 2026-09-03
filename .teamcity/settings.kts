import jetbrains.buildServer.configs.kotlin.*
import jetbrains.buildServer.configs.kotlin.buildSteps.script
import jetbrains.buildServer.configs.kotlin.triggers.vcs
import jetbrains.buildServer.configs.kotlin.vcs.GitVcsRoot

version = "2025.11"

project {
    vcsRoot(WebSource)
    buildType(WebDeployment)
}

object WebSource : GitVcsRoot({
    id("NeonLoft_GitHub")
    name = "MR-zyh221250/web"
    url = "https://github.com/MR-zyh221250/web.git"
    branch = "refs/heads/main"
})

object WebDeployment : BuildType({
    id("NeonLoft_BuildAndDeploy")
    name = "Neon Loft · Build, Check, Deploy"
    description = "Build and deploy to the dedicated Docker agent on the website server."
    maxRunningBuilds = 1
    artifactRules = ".ci-output/*.txt"
    vcs { root(WebSource) }
    params { param("env.NEON_BUILD_ID", "%teamcity.build.id%") }
    steps {
        script {
            name = "Build image and HTTP smoke checks"
            scriptContent = "sh ci/build.sh"
        }
        script {
            name = "Deploy and roll back on failure"
            scriptContent = "sh ci/deploy.sh"
        }
    }
    triggers { vcs { branchFilter = "+:<default>" } }
    requirements {
        equals("teamcity.agent.jvm.os.name", "Linux")
        equals("env.NEON_DEPLOY_TARGET", "neon-loft-production")
        exists("env.NEON_HTTP_PORT")
        exists("env.NEON_DEPLOY_STATE_DIR")
    }
})
