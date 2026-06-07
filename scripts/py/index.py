import enum
import sys
import asyncio
import webbrowser
import code
import traceback
from dataclasses import dataclass
from datetime import datetime

from pyodide.http import pyfetch
from pyodide.ffi import create_proxy
from pyscript import window

version_string = None  # Version string variable is exported as a global variable. Value is assigned when the PyScript main() is executed.

ProfileData = None  # Class with descriptor attributes, for loading profile data. Initialised from main()

interpreter = code.InteractiveInterpreter()  # runs user commands
execute_command_proxy = None


def repl_help() -> None:
    print(
        "\n".join(
            [
                "Portfolio REPL commands:",
                "  This site runs on PyScript.",
                "  Most normal Python REPL commands work here.",
                "  help()                 Show this help text",
                "  clear()                Clear the terminal",
                '  theme("amber")         Switch theme: green, amber, cyan, light',
                "  print(ABOUT)           About Adarsh",
                "  print(SKILLS)          Skills and ratings",
                "  print(EXPERIENCE)      Work experience",
                "  print(OPEN_SOURCE_CONTRIBUTIONS)",
                "  print(EDUCATION)",
                "  print(CERTIFICATIONS)",
                "  VISIT.BLOG             Open the blog",
                "  VISIT.GALLERY          Open the ASCII photo gallery",
                "  VISIT.SOURCE           Open the source code",
                "",
                "Use Up/Down for history and Left/Right to edit the current line.",
            ]
        )
    )


def execute_command(command: str) -> str:
    import io
    from contextlib import redirect_stdout, redirect_stderr

    # stdout and stderr are redirected to a string to be given as return to the js call
    with io.StringIO() as buf, redirect_stderr(buf):
        with io.StringIO() as buf1, redirect_stdout(buf1):
            for field in profile_fields_list:
                if field in command:
                    try:
                        value = getattr(ProfileData, field.lower())
                    except Exception:
                        traceback.print_exc()
                        output = buf1.getvalue()
                        output = output or buf.getvalue()
                        return "\n\r".join(output.split("\n"))
                    command = command.replace(field, repr(value))
            try:
                compiled_code = code.compile_command(
                    command
                )  # If compile code is not used, variable repr are not printed
            except (OverflowError, SyntaxError, ValueError):
                interpreter.showsyntaxerror()
            else:
                if compiled_code is None:
                    print("Incomplete command")
                else:
                    interpreter.runcode(compiled_code)
            output = buf1.getvalue()

        output = output or buf.getvalue()
        output = "\n\r".join(output.split("\n"))

    return output


# Used to store the profile data, along with the time it was fetched
# This is used to re-fetch the data after a certain amount of time has passed (currently 5 minutes)
@dataclass
class ProfileDataRecord:
    data_dict: dict
    refreshed_timestamp: float


# Enum defining profile categories
class ProfileFields(enum.Enum):
    NAME = enum.auto()
    ABOUT = enum.auto()
    SKILLS = enum.auto()
    EXPERIENCE = enum.auto()
    CONFERENCE_TALKS = enum.auto()
    OPEN_SOURCE_CONTRIBUTIONS = enum.auto()
    EDUCATION = enum.auto()
    CERTIFICATIONS = enum.auto()


profile_fields_list = [
    member.name for member in ProfileFields
]  # Used to show the pre-loaded variables


# Descriptor class for fetching profile data. Used to make variable loading dynamic
class ProfileFetchDescriptor:
    profile_data: ProfileDataRecord | None = None

    @classmethod
    async def load_profile_data(cls) -> None:
        # Get profile data by calling gitconnected API and store it as a class attribute
        resp = await pyfetch("https://gitconnected.com/v1/portfolio/adarshdigievo")
        cls.profile_data = ProfileDataRecord(
            data_dict=await resp.json(), refreshed_timestamp=datetime.now().timestamp()
        )

    def __init__(self, field: ProfileFields) -> None:
        self.field = field

    def __get__(self, _, __) -> str:
        current_timestamp = datetime.now().timestamp()
        if (
            current_timestamp - ProfileFetchDescriptor.profile_data.refreshed_timestamp
            > 300
        ):
            asyncio.run(self.load_profile_data())

        match self.field:
            case ProfileFields.NAME:
                return ProfileFetchDescriptor.profile_data.data_dict["basics"]["name"]

            case ProfileFields.ABOUT:
                about = ""
                about += (
                    f"{ProfileFetchDescriptor.profile_data.data_dict['basics']['name']} \n{ProfileFetchDescriptor.profile_data.data_dict['basics']['label']} \n"
                    ""
                )
                about += f"{ProfileFetchDescriptor.profile_data.data_dict['basics']['summary']}\n"
                about += "\nSocial Profiles: \n"
                for profile_data in ProfileFetchDescriptor.profile_data.data_dict[
                    "basics"
                ]["profiles"]:
                    about += f"{profile_data['network']}: {profile_data['username']}\n{profile_data['url']} \n\n"
                return str(about)

            case ProfileFields.SKILLS:
                skill_list = ProfileFetchDescriptor.profile_data.data_dict["skills"]
                return "\n".join(
                    f"{skill['name']} {'☆ ' * skill['rating']}" for skill in skill_list
                )

            case ProfileFields.EXPERIENCE:
                exp = ""
                for exp_data in ProfileFetchDescriptor.profile_data.data_dict["work"]:
                    position = exp_data.get("position", "Role")
                    company = exp_data.get("name", "Company")
                    start_date = exp_data.get("startDate", "")
                    end_date = exp_data.get("endDate") or "Present"
                    website = exp_data.get("website") or exp_data.get("url") or ""
                    summary = exp_data.get("summary", "")
                    highlights = exp_data.get("highlights") or []

                    exp += f"\n{'-' * 30}\n{position} at {company}  | {start_date} - {end_date}"
                    if website:
                        exp += f" | {website}"
                    exp += " \n\n"
                    exp += f"{summary} \n"
                    if highlights:
                        exp += "\n".join(
                            f"- {highlight}" for highlight in highlights
                        )
                    exp += "\n\n"
                return exp

            case ProfileFields.CONFERENCE_TALKS:
                talks = ""
                for talk in ProfileFetchDescriptor.profile_data.data_dict[
                    "publications"
                ]:
                    talks += f"\n{talk['name']}\n"
                    talks += f"{talk['url']} \n{talk['summary']} \n"
                return talks

            case ProfileFields.OPEN_SOURCE_CONTRIBUTIONS:
                oss_contributions = ""
                for contrib in ProfileFetchDescriptor.profile_data.data_dict[
                    "projects"
                ]:
                    oss_contributions += f"\n☆ {contrib['name']}\n"
                    oss_contributions += (
                        f"{contrib['githubUrl']} \n{contrib['summary']} \n"
                    )
                return oss_contributions

            case ProfileFields.EDUCATION:
                education = ""
                for edu in ProfileFetchDescriptor.profile_data.data_dict["education"]:
                    education += f"\n{edu['institution']} | {edu['area']} | {edu['studyType']} | {edu['startDate']} - {edu['endDate']} \n"
                    education += f"{edu['description']} \n"
                return education

            case ProfileFields.CERTIFICATIONS:
                return "".join(
                    f"\n{cert['name']} | {cert['issuer']} \n"
                    for cert in ProfileFetchDescriptor.profile_data.data_dict[
                        "certificates"
                    ]
                )
            case _:
                return "WIP"


class ProfileLinkDescriptor:
    link_map = {
        "blog": "https://blog.adarshd.dev",
        "gallery": "https://adarshd.dev/gallery.html",
        "source": "https://github.com/adarshdigievo/Portfolio-REPL/",
    }

    def __init__(self, target: str) -> None:
        if (url := ProfileLinkDescriptor.link_map.get(target)) is None:
            raise ValueError("undefined url")
        self.url = url

    def __get__(self, _, __) -> str:
        webbrowser.open(url=self.url, new=2)
        return "Opened in new tab.."


async def main():
    await ProfileFetchDescriptor.load_profile_data()

    attrs = {
        field.name.lower(): ProfileFetchDescriptor(field) for field in ProfileFields
    }

    global ProfileData

    # Dynamically generate a class named ProfileData. Each member attribute of the class is a descriptor
    ProfileData = type("ProfileData", (), attrs)

    link_attrs = {
        field.upper(): ProfileLinkDescriptor(field)
        for field in ProfileLinkDescriptor.link_map
    }
    ProfileLinks = type("ProfileLinks", (), link_attrs)

    VISIT = (
        ProfileLinks()
    )  # This class contains descriptor attributes which open corresponding webpages on access. Ex: VISIT.BLOG
    interpreter.locals |= {
        "VISIT": VISIT,
        "help": repl_help,
    }  # Load portfolio helpers to interpreter locals

    global site_description_string
    site_description_string = "\rAdarsh Divakaran | Portfolio REPL\n\n\r"
    site_description_string += (
        "Powered by PyScript: a real Python REPL in your browser.\n\r"
        "Most normal Python REPL commands work here.\n\n\r"
    )
    site_description_string += (
        f'Pre-loaded variables: {", ".join(profile_fields_list)}.\n\n\r'
    )
    # site_description_string += f"Try entering `print(ABOUT)` in the REPL\n\r"
    site_description_string += f"External links: Enter VISIT.BLOG, VISIT.GALLERY or VISIT.SOURCE to open Blog, Ascii Photo Gallery or Source code\n\n\r"

    global version_string
    version_string = f"Python {sys.version}\n\r"
    version_string += (
        'Type "help", "copyright", "credits" or "license" for more information.\n\r'
    )

    global execute_command_proxy
    execute_command_proxy = create_proxy(execute_command)
    window.portfolioReplExecuteCommand = execute_command_proxy
    window.portfolioReplSiteDescription = site_description_string
    window.portfolioReplVersion = version_string
    window.portfolioReplReady = True


asyncio.ensure_future(main())
