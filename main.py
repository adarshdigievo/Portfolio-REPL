import code
import enum
import requests


class ProfileFields(enum.Enum):
    NAME = enum.auto()
    ABOUT = enum.auto()
    SKILLS = enum.auto()
    EXPERIENCE = enum.auto()
    CONFERENCE_TALKS = enum.auto()
    OPEN_SOURCE_CONTRIBUTIONS = enum.auto()
    EDUCATION = enum.auto()
    CERTIFICATIONS = enum.auto()


class ProfileFetchDescriptor:
    profile_data = None

    def __init__(self, field: ProfileFields) -> None:
        self.field = field

    def __get__(self, _, __) -> str:
        if not ProfileFetchDescriptor.profile_data:
            ProfileFetchDescriptor.profile_data = requests.get(
                "https://gitconnected.com/v1/portfolio/adarshdigievo"
            ).json()

        match self.field:
            case ProfileFields.NAME:
                return ProfileFetchDescriptor.profile_data["basics"]["name"]
            case ProfileFields.ABOUT:
                about = ""
                about += (
                    f"{ProfileFetchDescriptor.profile_data['basics']['name']} \n{ProfileFetchDescriptor.profile_data['basics']['label']} \n"
                    ""
                )
                about += f"{ProfileFetchDescriptor.profile_data['basics']['summary']}\n"
                about += "\n Social Profiles: \n"
                for profile_data in ProfileFetchDescriptor.profile_data["basics"][
                    "profiles"
                ]:
                    about += f"{profile_data['network']}: {profile_data['username']}\n{profile_data['url']} \n\n"
                return str(about)
            case ProfileFields.SKILLS:
                skill_list = ProfileFetchDescriptor.profile_data["skills"]
                return "\n".join(
                    f"{skill['name']} {'☆ ' * skill['rating']}" for skill in skill_list
                )
            case ProfileFields.EXPERIENCE:
                exp = ""
                for exp_data in ProfileFetchDescriptor.profile_data["work"]:
                    exp += f"\n{'-' * 30}\n{exp_data['position']} at {exp_data['name']}  | {exp_data['startDate']} - {exp_data['endDate']} | {exp_data['website']} \n\n"
                    exp += f"{exp_data['summary']} \n"
                    if exp_data["highlights"]:
                        exp += "\n".join(
                            f"- {highlight}" for highlight in exp_data["highlights"]
                        )
                    exp += "\n\n"
                return exp
            case ProfileFields.CONFERENCE_TALKS:
                talks = ""
                for talk in ProfileFetchDescriptor.profile_data["publications"]:
                    talks += f"\n{talk['name']}\n"
                    talks += f"{talk['url']} \n{talk['summary']} \n"
                return talks
            case ProfileFields.OPEN_SOURCE_CONTRIBUTIONS:
                oss_contributions = ""
                for contrib in ProfileFetchDescriptor.profile_data["projects"]:
                    oss_contributions += f"\n☆ {contrib['name']}\n"
                    oss_contributions += (
                        f"{contrib['githubUrl']} \n{contrib['summary']} \n"
                    )
                return oss_contributions
            case ProfileFields.EDUCATION:
                education = ""
                for edu in ProfileFetchDescriptor.profile_data["education"]:
                    education += f"\n{edu['institution']} | {edu['area']} | {edu['studyType']} | {edu['startDate']} - {edu['endDate']} \n"
                    education += f"{edu['description']} \n"
                return education
            case ProfileFields.CERTIFICATIONS:
                certs = ""
                for cert in ProfileFetchDescriptor.profile_data["certificates"]:
                    certs += f"\n{cert['name']} | {cert['issuer']} \n"
                return certs
            case _:
                return "WIP"


attrs = {field.name.lower(): ProfileFetchDescriptor(field) for field in ProfileFields}
ProfileData = type("ProfileData", (), attrs)

variables_map = {
    field.name: getattr(ProfileData, field.name.lower()) for field in ProfileFields
}
print("Adarsh Divakaran | Portfolio REPL\n")
print(
    f'☆ Pre-loaded variables: {", ".join(variables_map.keys())}. \nExecute list(locals().keys()) in REPL to see available variables'
)
print(f"☆ Try entering `print(ABOUT)` to the REPL\n")
code.interact(local=variables_map)
